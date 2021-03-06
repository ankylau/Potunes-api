import * as Tracks from '../models/tracks'

// 获取某篇文章下面的所有歌曲
export function *getTracks(next) {
  const tracks = yield Tracks.get(this.query.id)
  this.render('track_list', {
    tracks,
    page_id: this.query.id,
    title: '歌单',
  })
}

// 批量更新歌曲信息
export function *updateTracks(next) {
  console.log('123333')
  console.log(this.request)
  console.log(this.request.body)

  yield Tracks.updateTracksInfo(this.request.body)
  this.redirect(`/api/admin/playlists/${this.params.id}`)
}
// 更新一首歌信息
export function *updateTrack(next) {
  const track = yield Tracks.updateTrack(this.request.body)
  this.body = track
}

export function *getOne(next) {
  const track = yield Tracks.getOne(this.query.id)
  this.body = track
}

export function *deleteTrack(next) {
  const result = yield Tracks.deleteTrack(this.request.body)
  this.body = result
}
