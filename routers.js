import Router from 'koa-router'
import _requiredir from 'require-dir'
import authentication from './lib/authentication'

const controllers = _requiredir('./controllers')

export default function() {
  const router = new Router()

  router.get('/', controllers.index.home)

  router.get('/admin', controllers.index.login)
  router.post('/admin', controllers.index.adminLogin)

  router.get('/articles/:id', authentication, controllers.index.articles)

  // 新建文章
  router.get('/article/new', authentication, controllers.new_article.home)
  router.post('/article/new', authentication, controllers.new_article.post)
  // 获取一篇文章内容
  router.get('/article', authentication, controllers.article.get)

  // 获取某篇文章下面的所有歌曲
  router.get('/track-list', authentication, controllers.track_list.getTracks)
  // 更新一首歌信息
  router.post('/track-list', authentication, controllers.track_list.updateTrack)
  // 批量更新歌曲信息
  router.post('/track-list/:id', authentication, controllers.track_list.updateTracks)
  // 获取一首歌
  router.get('/tracks/', authentication, controllers.track_list.getOne)
  // 删除一首歌
  router.delete('/tracks/:id', authentication, controllers.track_list.deleteTrack)

  // 获取旧服务器内容
  router.get('/tracks/fetch-old', authentication, controllers.tracks.fetchOld)

  return router
}
