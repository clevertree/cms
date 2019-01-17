const {ArticleDatabase} = require("./articledatabase.class");
const {UserSession} = require('../user/usersession.class');
// const {UserDatabase} = require("../user/userdatabase.class");

class ArticleAPI {
    constructor(app) {
        this.app = app;
    }

    get articleDB () { return new ArticleDatabase(this.app.db); }

    loadRoutes(router) {
        // Handle Article requests
        router.get(['/[\\w/]+', '/'], async (req, res, next) => await this.renderArticleByPath(req, res,next));

        router.get('/:?article/:id/json', async (req, res, next) => await this.renderArticleByID(true, req, res, next));
        router.get(['/:?article/:id/view', '/:?article/:id'], async (req, res, next) => await this.renderArticleByID(false, req, res, next));
        router.all('/:?article/:id/edit', async (req, res) => await this.renderArticleEditorByID(req, res));
        router.all(['/:?article', '/:?article/list'], async (req, res) => await this.renderArticleBrowser(req, res));
    }

    async renderArticleByPath(req, res, next) {
        try {
            const article = await this.articleDB.fetchArticleByPath(req.url);
            if(!article)
                return next();

            if(typeof req.query.r !== 'undefined') {
                const articleRevisionID = parseInt(req.query.r);
                const articleRevision = await this.articleDB.fetchArticleRevisionByID(articleRevisionID);
                if(!articleRevision)
                    throw new Error("Article Revision ID not found: " + articleRevisionID);

                if(articleRevision.article_id !== article.id)
                    throw new Error("Revision does not belong to article");
                article.title = articleRevision.title;
                article.content = articleRevision.content;
            }

            res.send(
                await this.app.getTheme(article.theme)
                    .render(req, article.content, {article})
            );
        } catch (error) {
            res.status(400);
            res.send(
                await this.app.getTheme()
                    .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
            );
        }
    }

    async renderArticleByID(asJSON, req, res, next) {
        try {
            const article = await this.articleDB.fetchArticleByID(req.params.id);
            if(!article)
                return next();

            if(typeof req.query.r !== 'undefined') {
                const articleRevisionID = parseInt(req.query.r);
                const articleRevision = await this.articleDB.fetchArticleRevisionByID(articleRevisionID);
                if(!articleRevision)
                    throw new Error("Article Revision ID not found: " + articleRevisionID);

                if(articleRevision.article_id !== article.id)
                    throw new Error("Revision does not belong to article");
                article.title = articleRevision.title;
                article.content = articleRevision.content;
            }

            if(asJSON) {
                const response = {
                    redirect: '/:article/' + article.id + '/view',
                    message: "Article Queried Successfully",
                    editable: false,
                    article
                };
                const sessionUser = await new UserSession(req.session).getSessionUser(this.app.db);
                if(sessionUser.isAdmin() || sessionUser.id === article.user_id)
                    response.editable = true;
                if(req.query.getAll || req.query.getRevision) {
                    response.history = await this.articleDB.fetchArticleRevisionsByArticleID(article.id);
                    response.revision = await this.articleDB.fetchArticleRevisionByID(article.id, req.query.getRevision || null);
                    if(!response.revision && response.history.length > 0)
                        response.revision = await this.articleDB.fetchArticleRevisionByID(article.id, response.history[0].id); // response.history[0]; // (await this.articleDB.fetchArticleRevisionsByArticleID(article.id))[0];
                }
                if(req.query.getAll) {
                    response.parentList = await this.articleDB.queryMenuData(false);
                }

                res.json(response);

            } else {
                res.send(
                    await this.app.getTheme(article.theme)
                        .render(req, article.content, {article})
                );
            }
        } catch (error) {
            res.status(400);
            if(asJSON) {
                res.json({message: error.stack});
            } else {
                res.send(
                    await this.app.getTheme()
                        .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
                );
            }
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
                        .render(req, `<%- include("article/section/editor.ejs")%>`, article)
                );

            } else {
                // Handle POST
                let insertArticleRevisionID, revision;
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
                            message: "Article published successfully.<br/>Redirecting...",
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
                        revision = await this.articleDB.fetchArticleRevisionByID(insertArticleRevisionID);
                        return res.json({
                            redirect: '/:article/' + article.id + '/view?r=' + revision.id,
                            message: "Draft saved successfully",
                            insertArticleRevisionID: insertArticleRevisionID,
                            article
                        });
                }
            }
        } catch (error) {
            res.status(400);
            if(req.method === 'GET') {          // Handle GET
                res.send(
                    await this.app.getTheme()
                        .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
                );
            } else {
                res.json({message: error.stack});
            }
        }
    }

    async renderArticleBrowser(req, res) {
        try {
            // const session = new UserSession(req.session);
            // const sessionUser = await session.getSessionUser(this.app.db);
            // if (!sessionUser)
            //     throw new Error("Must be logged in");

            if (req.method === 'GET') {
                res.send(
                    await this.app.getTheme()
                        .render(req, `<%- include("article/section/browser.ejs")%>`)
                );

            } else {
                // Handle POST
                let whereSQL = '1', values = null;
                if(req.body.search) {
                    whereSQL = 'a.title LIKE ? OR a.content LIKE ? OR a.path LIKE ?';
                    values = ['%'+req.body.search+'%', '%'+req.body.search+'%', '%'+req.body.search+'%'];
                }
                const articles = await this.articleDB.selectArticles(whereSQL, values);

                return res.json({
                    message: "Article list queried successfully",
                    articles
                });
            }
        } catch (error) {
            res.status(400);
            if(req.method === 'GET') {
                res.send(
                    await this.app.getTheme()
                        .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
                );
            } else {
                res.json({message: error.stack});
            }
        }

    }
}


module.exports = {ArticleAPI};

