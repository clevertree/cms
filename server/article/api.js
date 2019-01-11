const {UserSession} = require('./user.js');

class ArticleAPI {
    constructor(app) {
        this.app = app;
    }

    get articleDB () { return new ArticleDB(this.app.db); }

    loadRoutes(router) {
        // Handle Article requests
        router.get(['/[\\w/]+(?:\.ejs)?', '/'], async (req, res, next) => await this.renderArticleByPath(req, res,next));


        router.get(['/:?article/:id/view', '/:?article/:id'], async (req, res, next) => await this.renderArticleByID(req, res, next));
        router.all('/:?article/:id/edit', async (req, res, next) => await this.renderArticleEditorByID(req, res, next));
    }

    async renderArticleByPath(req, res, next) {
        try {
            const article = await this.articleDB.fetchArticleByPath(req.url);
            if(!article)
                return next();

            if(isJSON(req)) {
                res.json(article);

            } else {
                res.send(
                    await this.app.getTheme(article.theme)
                        .render(req, article.content, {article})
                );
            }
        } catch (error) {
            res.status(400).send(error.message || error)
        }
    }

    async renderArticleByID(req, res, next) {
        try {
            const article = await this.articleDB.fetchArticleByID(req.params.id);
            if(!article)
                return next();

            if(isJSON(req)) {
                res.json(article);

            } else {
                res.send(
                    await this.app.getTheme(article.theme)
                        .render(req, article.content, {article})
                );
            }
        } catch (error) {
            res.status(400).send(error.message || error)
        }
    }

    async renderArticleEditorByID(req, res, next) {
        let response;
        try {
            let insertID;
            const article = await this.articleDB.fetchArticleByID(req.params.id);
            if(!article)
                return next();
            response = {
                redirect: '/:article/' + article.id + '/view',
                message: "Article queried successfully",
                status: 200,
                article
            };

            if(req.method === 'GET') {          // Handle GET
                if(!isJSON(req)) {
                    // Render Editor
                    res.send(
                        await this.app.getTheme(article.theme)
                            .render(req, `
                                <script src="/client/form/article-form/article-form.client.js"></script>
                                <article-form article-id="${article.id}"></article-form>
                            `)
                    );
                }

                // TODO: fetch
            } else {                            // Handle POST
                switch (req.body.action) {
                    default:
                    case 'publish':
                        const affectedRows = await this.articleDB.updateArticle(
                            article.id,
                            req.body.title,
                            req.body.content,
                            req.body.path,
                            req.sessionUser ? req.sessionUser.id : null,
                            req.body.parent_id ? parseInt(req.body.parent_id) : null,
                            req.body.theme,
                            req.body.flags);

                        insertID = await this.articleDB.insertArticleHistory(
                            article.id,
                            req.body.title,
                            req.body.content,
                            req.sessionUser ? req.sessionUser.id : null);
                        response.message = "Article published successfully";
                        response.insertArticleHistoryID = insertID;
                        response.affectedArticleRows = affectedRows;
                        break;

                    case 'draft':
                        insertID = await this.articleDB.insertArticleHistory(
                            article.id,
                            req.body.title,
                            req.body.content,
                            req.sessionUser ? req.sessionUser.id : null);
                        response.message = "Draft saved successfully";
                        response.insertArticleHistoryID = insertID;
                        break;
                }
            }
        } catch (error) {
            response.message = error.stack;
            response.status = 400;
        }

        // Return Status
        res.status(response.status);
        if(isJSON(req)) {
            res.json(response);
        } else {
            new UserSession(req.session).addMessage(response.message);
            res.redirect(response.redirect);
        }
    }

}


module.exports = {ArticleAPI};


function isJSON(req) {
    return req.headers.accept.split(',').indexOf('application/json') !== -1;
}