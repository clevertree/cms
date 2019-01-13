const {ArticleDatabase} = require("./articledatabase");
const {UserSession} = require('../user/usersession.class');
// const {UserDatabase} = require("../user/userdatabase.class");

class ArticleAPI {
    constructor(app) {
        this.app = app;
    }

    get articleDB () { return new ArticleDatabase(this.app.db); }

    loadRoutes(router) {
        // Handle Article requests
        router.get(['/[\\w/]+(?:\.ejs)?', '/'], async (req, res, next) => await this.renderArticleByPath(req, res,next));
        // router.get(['/[\\w/]+(?:\.ejs)?/json', '/json'], async (req, res, next) => await this.renderArticleByPath(req, res,next));


        router.get('/:?article/:id/json', async (req, res, next) => await this.renderArticleByID(true, req, res, next));
        router.get(['/:?article/:id/view', '/:?article/:id'], async (req, res, next) => await this.renderArticleByID(false, req, res, next));
        router.all('/:?article/:id/edit', async (req, res, next) => await this.renderArticleEditorByID(req, res, next));
    }

    async renderArticleByPath(req, res, next) {
        try {
            const article = await this.articleDB.fetchArticleByPath(req.url);
            if(!article)
                return next();

            res.send(
                await this.app.getTheme(article.theme)
                    .render(req, article.content, {article})
            );
        } catch (error) {
            res.status(400);
            res.json({message: error.stack});
        }
    }

    async renderArticleByID(asJSON, req, res, next) {
        try {
            const article = await this.articleDB.fetchArticleByID(req.params.id);
            if(!article)
                return next();

            if(asJSON) {
                const response = {
                    redirect: '/:article/' + article.id + '/view',
                    message: "Article Queried Successfully",
                    article
                };
                if(req.query.getAll || req.query.getRevision) {
                    response.history = await this.articleDB.fetchArticleRevisionsByArticle(article.id);
                    response.revision = await this.articleDB.fetchArticleRevisionByDate(article.id, req.query.getRevision);
                    if(!response.revision && response.history.length > 0)
                        response.revision = await this.articleDB.fetchArticleRevisionByDate(article.id, response.history[0].created); // response.history[0]; // (await this.articleDB.fetchArticleRevisionsByArticle(article.id))[0];
                    // TODO: get article parent list
                }

                res.json(response);

            } else {
                res.send(
                    await this.app.getTheme(article.theme)
                        .render(req, article.content, {article})
                );
            }
        } catch (error) {
            // TODO: as JSON
            res.status(400);
            res.json({message: error.stack});
        }
    }

    async renderArticleEditorByID(req, res, next) {
        try {
            const session = new UserSession(req.session);
            const sessionUser = await session.getSessionUser(this.app.db);
            if(!sessionUser)
                throw new Error("Must be logged in");

            const article = await this.articleDB.fetchArticleByID(req.params.id);
            if(!article)
                return next();

            if(!sessionUser.isAdmin() && sessionUser.id !== article.user_id)
                throw new Error("Not authorized");

            if(req.method === 'GET') {          // Handle GET
                // Render Editor
                res.send(
                    await this.app.getTheme(article.theme)
                        .render(req, `
                            <script src="/server/article/element/articleform-editor.client.js"></script>
                            <articleform-editor id="${article.id}"></articleform-editor>
                        `)
                );

            } else {
                // Handle POST
                let insertArticleRevisionID;
                switch (req.body.action) {
                    default:
                    case 'publish':
                        const affectedRows = await this.articleDB.updateArticle(
                            article.id,
                            req.body.title,
                            req.body.content,
                            req.body.path,
                            sessionUser.id,
                            req.body.parent_id ? parseInt(req.body.parent_id) : null,
                            req.body.theme,
                            req.body.flags
                        );

                        insertArticleRevisionID = await this.articleDB.insertArticleRevision(
                            article.id,
                            req.body.title,
                            req.body.content,
                            sessionUser.id
                        );

                        return res.json({
                            redirect: '/:article/' + article.id + '/view',
                            message: "Article published successfully",
                            insertArticleRevisionID: insertArticleRevisionID,
                            affectedArticleRows: affectedRows,
                            article
                        });

                    case 'draft':
                        insertArticleRevisionID = await this.articleDB.insertArticleRevision(
                            article.id,
                            req.body.title,
                            req.body.content,
                            sessionUser.id
                        );
                        return res.json({
                            redirect: '/:article/' + article.id + '/view',
                            message: "Draft saved successfully",
                            insertArticleRevisionID: insertArticleRevisionID,
                            article
                        });
                }
            }
        } catch (error) {
            res.status(400);
            res.json({message: error.stack});
        }
    }

}


module.exports = {ArticleAPI};

