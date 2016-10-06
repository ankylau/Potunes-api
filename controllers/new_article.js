import * as Articles from '../models/articles'

export function *home(next) {
	yield this.render('new_article', {
		title: '新增文章',
	})
}

export function *post(next) {
	const body = this.request.body

	Articles.save(body)

	this.redirect('/articles')
}