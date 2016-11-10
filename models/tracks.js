import promisify from 'promisify-es6'
import * as pool from '../models/db'
import async from 'async'
import xml2js from 'xml2js-es6-promise'
import agent from 'superagent-es6-promise'


const series = promisify(async.series)

// 获取某篇文章下面的所有歌曲
export function *get(id) {
  const playlistQuery = 'SELECT * FROM playlist_tracks where playlist_id = ?'
  const playlistQuery_Params = [id]
  const trackIDs = []
  const result = yield pool.query(playlistQuery, playlistQuery_Params)
  const idQuery = 'SELECT * FROM tracks WHERE id = ?'
  for (let i = 0; i < result.length; i++) {
    const idParams = [result[i].track_id]
    trackIDs.push(pool.cr(idQuery, idParams))
  }
  return new Promise((resolve, reject) => {
    series(trackIDs)
    .then((results) => {
      const tracks = []
      for (let i = 0; i < results.length; i++) {
        tracks.push(results[i][0])
      }
      resolve(tracks)
    })
    .catch(err => {
      reject(err)
    })
  })
}

export function* getTracksByMobile(query) {
  const tracksQuery = 'SELECT tracks.id,artist, name, cover,  url FROM tracks INNER JOIN playlist_tracks ON tracks.id = playlist_tracks.track_id WHERE playlist_tracks.playlist_id = ?;'

  const params = [query]
  const tracks = yield pool.query(tracksQuery, params)
  return tracks
}


// 获取一首歌的信息
export function *getOne(track_id) {
  const trackQuery = 'SELECT * FROM tracks where id = ?'
  const trackQuery_params = [track_id]
  const result = yield pool.query(trackQuery, trackQuery_params)
  return result[0]
}

// 批量更新歌曲信息
export function *updateTracksInfo(body) {
  const updateQuery = 'UPDATE tracks SET artist = ?, name = ? WHERE id = ?'
  let ids = body.ids
  ids = ids.split(',')
  const content = body.content
  return new Promise((resolve, reject) => {
    xml2js(content)
    .then((js) => {
      const tracks = js.plist.dict[0].dict[0].dict
      const temp = []
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i].string
        temp.push(track.slice(0, 2))
      }
      const tracksFunc = []
      for (let i = 0; i < ids.length; i++) {
        const artist = temp[i][1]
        const name = temp[i][0]
        const track_id = ids[i]

        const trackParams = [artist, name, track_id]
        tracksFunc.push(pool.cr(updateQuery, trackParams))
      }
      series(tracksFunc)
      .then((result) => {
        console.log('歌曲信息修改成功')
        resolve(result)
      })
    })
    .catch((err) => {
      console.log(err)
      reject(err)
    })
  })
}
// 更新一首歌信息
export function *updateTrack(body) {
  const updateQuery = `UPDATE tracks SET artist = ?,
  name = ?, cover = ?, url = ? , lrc = ?, lrc_cn = ? WHERE id = ?`
  const trackParams = []
  for (let i = 1; i < body.length; i++) {
    trackParams.push(body[i].value)
  }
  trackParams.push(body[0].value)
  const result = yield pool.query(updateQuery, trackParams)
  return result
}

// 删除一首歌的信息
export function *deleteTrack(body) {
  const deleteQuery = `DELETE tracks, playlist_tracks from tracks
                      LEFT JOIN playlist_tracks
                      ON tracks.id = playlist_tracks.track_id WHERE tracks.id= ?`
  const trackParams = [body.track_id]
  const result = yield pool.query(deleteQuery, trackParams)
  return result
}

function cr(url) {
  return cb => {
    agent.get(url)
    .then(res => {
      cb(null, JSON.parse(res.text))
    })
    .catch(err => {
      cb(err)
    })
  }
}
// 抓取老数据库歌曲信息
export function* fecthOldTracks(playlists) {
  const oldIdQuery = 'select * from playlists order by id desc'
  const ids = []
  const tracksArr = []
  const result = yield pool.query(oldIdQuery)
  for (let i = 0; i < result.length; i++) {
    const mp3URL = `http://121.41.121.87:3000/api/v1/list-mp3s?id=${result[i].old_id}`
    ids.push(cr(mp3URL))
  }
  return new Promise((resolve, reject) => {
    series(ids)
    .then(res => {
      tracksArr.push(res)
      return tracksArr
    })
    .then((tracks) => {
      const tracksTemp = []
      const tracksQuery = `INSERT INTO tracks(artist,
      	name, album, url, cover) VALUES(?,?,?,?,?)`

      for (let i = 0; i < tracks[0].length; i++) {
        const album = result[i].title
        for (let j = 0; j < tracks[0][i].length; j++) {
          const track = tracks[0][i][j]
          const tracksParams = [track.author, track.title, album, track.sourceUrl, track.thumb]
          tracksTemp.push(pool.cr(tracksQuery, tracksParams))
        }
      }
      series(tracksTemp)
      .then((res) => {
        resolve(res)
        console.log('旧歌曲已插入Tracks表')
      })
    })
    .catch(err => {
      reject(err)
    })
  })
}

export function* match(next) {
  const titleQuery = 'select distinct album from tracks'
  const idQuery = 'select id from playlists'
  const titles = yield pool.query(titleQuery)
  const ids = yield pool.query(idQuery)
  const track_ids = []
  for (let i = 0; i < titles.length; i++) {
    const matchQuery = `select id from tracks where album = '${titles[i].album}'`
    const result = yield pool.query(matchQuery)
    track_ids.push(result)
  }
  const reverse = ids.reverse()
  for (let i = 0; i < ids.length; i++) {
    const insertQuery = 'insert into playlist_tracks(playlist_id) values(?)'
    const insertParam = [reverse[i].id]
    for (let j = 0; j < track_ids[i].length; j++) {
      yield pool.query(insertQuery, insertParam)
    }
  }
  return titles
}

export function* getLrc(query) {
  const lrcQuery = 'select lrc,lrc_cn from tracks where id = ?'
  const lrcParam = [query]
  const lrc = yield pool.query(lrcQuery, lrcParam)
  return lrc[0]
}

export function* create(body) {
  const trackQuery = `insert into tracks(artist,
  name, cover, url, lrc, lrc_cn) values(?,?,?,?,?,?)`
  const trackParams = []
  for (let i = 0; i < body.length - 1; i++) {
    trackParams.push(body[i].value)
  }
  yield pool.query(trackQuery, trackParams)
  const playlistQuery = 'insert into playlist_tracks(playlist_id) values(?)'
  const playlistParams = [body[body.length - 1].value]
  const success = yield pool.query(playlistQuery, playlistParams)
  return success
}
