const express = require('express');

const { DatabaseManager } = require('../database/database.manager');
const { ThemeManager } = require('../theme/theme.manager');
const { ArticleDatabase } = require("./article.database");
const { UserDatabase } = require("../user/user.database");

class ArticleAPI {
    constructor() {
        this.router = null;
    }


    getMiddleware() {
        if(!this.router)
            this.configure();

        return (req, res, next) => {
            return this.router(req, res, next);
        }
    }

    async configure(config=null) {
        // Configure Routes
        const router = express.Router();
        const bodyParser = require('body-parser');
        const postMiddleware = [bodyParser.urlencoded({ extended: true }), bodyParser.json()];
        // Handle Article requests
        router.get(['/[\\w/_-]+', '/'], async (req, res, next) => await this.renderArticleByPath(req, res,next));

        router.get('/:?article/:id/json', async (req, res, next) => await this.renderArticleByID(true, req, res, next));
        router.get(['/:?article/:id/view', '/:?article/:id'], async (req, res, next) => await this.renderArticleByID(false, req, res, next));
        router.get('/:?article/sync', async (req, res) => await this.renderArticleBrowser(req, res));
        // TODO: sync

        router.all('/:?article/:id/edit', postMiddleware, async (req, res) => await this.renderArticleEditorByID(req, res));
        router.all('/:?article/add', postMiddleware, async (req, res) => await this.renderArticleAdd(req, res));
        router.all(['/:?article', '/:?article/list'], postMiddleware, async (req, res) => await this.renderArticleBrowser(req, res));
        this.router = router;
    }

    async renderArticleByPath(req, res, next) {
        try {
            const articleDB = await DatabaseManager.getArticleDB(req);
            const article = await articleDB.fetchArticleByPath(req.url);
            if(!article)
                return next();

            if(typeof req.query.r !== 'undefined') {
                const articleRevisionID = parseInt(req.query.r);
                const articleRevision = await articleDB.fetchArticleRevisionByID(articleRevisionID);
                if(!articleRevision)
                    throw new Error("Article Revision ID not found: " + articleRevisionID);

                if(articleRevision.article_id !== article.id)
                    throw new Error("Revision does not belong to article");
                article.title = articleRevision.title;
                article.content = articleRevision.content;
            }

            res.send(
                await ThemeManager.get(article.theme)
                    .render(req, article.content, {article})
            );
        } catch (error) {
            console.log(error);
            res.status(400);
            res.send(
                await ThemeManager.get()
                    .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
            );
        }
    }

    async renderArticleByID(asJSON, req, res, next) {
        try {
            const articleDB = await DatabaseManager.getArticleDB(req);
            const article = await articleDB.fetchArticleByID(req.params.id);
            if(!article)
                return next();

            let articleRevision = null;
            if(typeof req.query.r !== 'undefined') {
                const articleRevisionID = parseInt(req.query.r);
                articleRevision = await articleDB.fetchArticleRevisionByID(articleRevisionID);
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
                if(req.session && req.session.userID) {
                    const userDB = await DatabaseManager.getUserDB(req);
                    const sessionUser = await userDB.fetchUserByID(req.session.userID);
                    if (sessionUser.isAdmin() || sessionUser.id === article.user_id)
                        response.editable = true;
                }
                if(req.query.getAll || req.query.getHistory) {
                    response.history = await articleDB.fetchArticleRevisionsByArticleID(article.id);
                    // response.revision = await articleDB.fetchArticleRevisionByID(article.id, req.query.getRevision || null);
                    if(!articleRevision && response.history.length > 0)
                        articleRevision = await articleDB.fetchArticleRevisionByID(response.history[0].id); // response.history[0]; // (await articleDB.fetchArticleRevisionsByArticleID(article.id))[0];
                }
                if(articleRevision)
                    response.revision = articleRevision;
                if(req.query.getAll) {
                    response.parentList = await articleDB.queryMenuData(false);
                }

                res.json(response);

            } else {
                res.send(
                    await ThemeManager.get(article.theme)
                        .render(req, article.content, {article})
                );
            }
        } catch (error) {
            console.log(error);
            res.status(400);
            if(asJSON) {
                res.json({message: error.stack});
            } else {
                res.send(
                    await ThemeManager.get()
                        .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
                );
            }
        }
    }

    async renderArticleEditorByID(req, res, next) {
        try {
            const articleDB = await DatabaseManager.getArticleDB(req);
            const userDB = await DatabaseManager.getUserDB(req);

            if(!req.session || !req.session.userID)
                throw new Error("Must be logged in");
            const sessionUser = await userDB.fetchUserByID(req.session.userID);

            const article = await articleDB.fetchArticleByID(req.params.id);
            if(!article)
                return next();

            if(!sessionUser.isAdmin() && sessionUser.id !== article.user_id)
                throw new Error("Not authorized");

            if(req.method === 'GET') {          // Handle GET
                // Render Editor
                res.send(
                    await ThemeManager.get(article.theme)
                        .render(req, `<%- include("article/section/editor.ejs", {article})%>`, {article})
                );

            } else {
                // Handle POST
                let insertArticleRevisionID, revision;
                switch (req.body.action) {
                    default:
                    case 'publish':
                        const affectedRows = await articleDB.updateArticle(
                            article.id,
                            req.body.title,
                            req.body.content,
                            req.body.path,
                            sessionUser.id,
                            req.body.parent_id ? parseInt(req.body.parent_id) : null,
                            req.body.theme,
                            req.body.flags
                        );

                        insertArticleRevisionID = await articleDB.insertArticleRevision(
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
                        insertArticleRevisionID = await articleDB.insertArticleRevision(
                            article.id,
                            req.body.title,
                            req.body.content,
                            sessionUser.id
                        );
                        revision = await articleDB.fetchArticleRevisionByID(insertArticleRevisionID);
                        return res.json({
                            redirect: '/:article/' + article.id + '/view?r=' + revision.id,
                            message: "Draft saved successfully",
                            insertArticleRevisionID: insertArticleRevisionID,
                            article
                        });
                }
            }
        } catch (error) {
            console.log(error);
            res.status(400);
            if(req.method === 'GET') {          // Handle GET
                res.send(
                    await ThemeManager.get()
                        .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
                );
            } else {
                res.json({message: error.stack});
            }
        }
    }

    async renderArticleAdd(req, res) {
        try {
            const articleDB = await DatabaseManager.getArticleDB(req);
            const userDB = await DatabaseManager.getUserDB(req);
            if(!req.session || !req.session.userID)
                throw new Error("Must be logged in");
            const sessionUser = await userDB.fetchUserByID(req.session.userID);

            if(!sessionUser.isAdmin())
                throw new Error("Not authorized");

            if(req.method === 'GET') {          // Handle GET
                // Render Editor
                res.send(
                    await ThemeManager.get()
                        .render(req, `<%- include("article/section/add.ejs")%>`)
                );

            } else {
                // Handle POST
                const insertID = await articleDB.insertArticle(
                    req.body.title,
                    req.body.content,
                    req.body.path,
                    sessionUser.id,
                    req.body.parent_id ? parseInt(req.body.parent_id) : null,
                    req.body.theme
                );
                const article = await articleDB.fetchArticleByID(insertID);
                return res.json({
                    redirect: '/:article/' + insertID + '/edit',
                    message: "Article created successfully. Redirecting...",
                    insertID: insertID,
                    article
                });
            }
        } catch (error) {
            console.log(error);
            res.status(400);
            if(req.method === 'GET') {          // Handle GET
                res.send(
                    await ThemeManager.get()
                        .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
                );
            } else {
                res.json({message: error.stack});
            }
        }
    }

    async renderArticleBrowser(req, res) {
        try {
            const articleDB = await DatabaseManager.getArticleDB(req);

            if (req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `<%- include("article/section/browser.ejs")%>`)
                );

            } else {
                // Handle POST
                let whereSQL = '1', values = null;
                if(req.body.search) {
                    whereSQL = 'a.title LIKE ? OR a.content LIKE ? OR a.path LIKE ?';
                    values = ['%'+req.body.search+'%', '%'+req.body.search+'%', '%'+req.body.search+'%'];
                }
                const articles = await articleDB.selectArticles(whereSQL, values);

                return res.json({
                    message: "Article list queried successfully",
                    articles
                });
            }
        } catch (error) {
            console.log(error);
            res.status(400);
            if(req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
                );
            } else {
                res.json({message: error.stack});
            }
        }

    }
}


module.exports = {ArticleAPI: new ArticleAPI()};

