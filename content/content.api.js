const path = require('path');

const { HTTPServer } = require('../http/http.server');
const { DatabaseManager } = require('../database/database.manager');
const { ThemeAPI } = require('../theme/theme.api');
const { ContentDatabase } = require("./content.database");
const { UserDatabase } = require("../user/user.database");
const { UserAPI } = require('../user/user.api');
const { SessionAPI } = require('../session/session.api');

const DIR_CONTENT = path.resolve(__dirname);

class ContentApi {
    constructor() {
    }


    getMiddleware() {
        const express = require('express');
        const bodyParser = require('body-parser');

        const router = express.Router();
        const PM = [bodyParser.urlencoded({ extended: true }), bodyParser.json()];
        const SM = SessionAPI.getMiddleware();
        // Handle Content requests
        router.get(['/[\\w/_-]+', '/'],                         SM, async (req, res, next) => await this.renderContentByPath(req, res,next));

        router.get('/[:]content/:id/[:]json',                   SM, async (req, res, next) => await this.renderContentByID(true, req, res, next));
        router.get(['/[:]content/:id/view', '/[:]content/:id'], SM, async (req, res, next) => await this.renderContentByID(false, req, res, next));
        router.get('/[:]content/[:]sync',                       SM, async (req, res) => await this.renderContentBrowser(req, res));
        // TODO: sync

        router.all('/[:]content/:id/[:]edit',                   SM, PM, async (req, res) => await this.renderContentEditorByID(req, res));
        router.all('/[:]content/:id/[:]delete',                 SM, PM, async (req, res) => await this.renderContentDeleteByID(req, res));
        router.all('/[:]content/[:]add',                        SM, PM, async (req, res) => await this.renderContentAdd(req, res));
        router.all(['/[:]content', '/[:]content/[:]list'],      SM, PM, async (req, res) => await this.renderContentBrowser(req, res));


        // User Asset files
        router.get('/[:]content/[:]client/*',                      async (req, res, next) => await this.handleContentStaticFiles(req, res, next));


        return (req, res, next) => {
            // if(!req.url.startsWith('/:content'))
            //     return next();
            return router(req, res, next);
        }
    }

    async handleContentStaticFiles(req, res, next) {
        const routePrefix = '/:content/:client/';
        if(!req.url.startsWith(routePrefix))
            throw new Error("Invalid Route Prefix: " + req.url);
        const assetPath = req.url.substr(routePrefix.length);

        const staticFile = path.resolve(DIR_CONTENT + '/client/' + assetPath);
        HTTPServer.renderStaticFile(staticFile, req, res, next);
    }

    async checkForRevisionContent(req, content) {
        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const contentDB = new ContentDatabase(database);
        if(typeof req.query.r !== 'undefined') {
            const contentRevisionID = parseInt(req.query.r);
            const contentRevision = await contentDB.fetchContentRevisionByID(contentRevisionID);
            if(!contentRevision)
                throw new Error("Content Revision ID not found: " + contentRevisionID);

            if(contentRevision.content_id !== content.id)
                throw new Error("Revision does not belong to content");

            content.data = contentRevision.data;
            content.title = contentRevision.title;
            return contentRevision;
        }
        return null;
    }

    async renderContentByPath(req, res, next) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const contentDB = new ContentDatabase(database);
            const content = await contentDB.fetchContentByPath(req.url);
            if(!content)
                return next();

            await this.checkForRevisionContent(req, content);

            await ThemeAPI.send(req, res, content);
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }


    async renderContentByID(asJSON, req, res, next) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const contentDB = new ContentDatabase(database);
            const content = await contentDB.fetchContentByID(req.params.id);
            if(!content)
                return next();

            let contentRevision = await this.checkForRevisionContent(req, content);

            if(asJSON) {
                const response = {
                    redirect: content.url,
                    message: "Content Queried Successfully",
                    editable: false,
                    content
                };
                if(req.session && req.session.userID) {
                    const database = await DatabaseManager.selectDatabaseByRequest(req);
                    const userDB = new UserDatabase(database);
                    const sessionUser = await userDB.fetchUserByID(req.session.userID);
                    if (sessionUser.isAdmin() || sessionUser.id === content.user_id)
                        response.editable = true;
                }
                if(req.query.getAll || req.query.getHistory) {
                    response.history = await contentDB.fetchContentRevisionsByContentID(content.id);
                    // response.revision = await contentDB.fetchContentRevisionByID(content.id, req.query.getRevision || null);
                    if(!contentRevision && response.history.length > 0) // Fetch latest revision? sloppy
                        contentRevision = await contentDB.fetchContentRevisionByID(response.history[0].id); // response.history[0]; // (await contentDB.fetchContentRevisionsByContentID(content.id))[0];
                }
                if(contentRevision)
                    response.revision = contentRevision;
                if(req.query.getAll) {
                    response.parentList = await contentDB.selectContent("a.path IS NOT NULL", null, "id, path, title");
                }

                res.json(response);

            } else {
                await ThemeAPI.send(req, res, content);
            }
        } catch (error) {
            await this.renderError(error, req, res, asJSON);
        }
    }

    async renderContentEditorByID(req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const contentDB = new ContentDatabase(database);
            const userDB = new UserDatabase(database);

            if(!req.session || !req.session.userID)
                throw new Error("Must be logged in");
            const sessionUser = await userDB.fetchUserByID(req.session.userID);

            let content = await contentDB.fetchContentByID(req.params.id);

            switch(req.method) {
                case 'GET':
                    // Render Editor
                    await ThemeAPI.send(req, res, `<section style="max-width: 1600px;">
                <script src="/:content/:client/content-editor.element.js"></script>
                <content-editor id="${req.params.id}"></content-editor>
            </section>
            <section class="content-preview-container">
                <h1 style="text-align: center;">Preview</h1>
                <hr/>
                <div class="content-preview-content">
                    ${content.data}
                </div>
            </section>
    `);
                    break;
                case 'OPTIONS':

                    let contentRevision = await this.checkForRevisionContent(req, content);

                    const response = {
                        redirect: content.url,
                        message: "Content Queried Successfully",
                        editable: false,
                        content
                    };
                    if(req.session && req.session.userID) {
                        const database = await DatabaseManager.selectDatabaseByRequest(req);
                        const userDB = new UserDatabase(database);
                        const sessionUser = await userDB.fetchUserByID(req.session.userID);
                        if (sessionUser.isAdmin() || sessionUser.id === content.user_id)
                            response.editable = true;
                    }
                    response.history = await contentDB.fetchContentRevisionsByContentID(content.id);
                    // response.revision = await contentDB.fetchContentRevisionByID(content.id, req.query.getRevision || null);
                    if(!contentRevision && response.history.length > 0) // Fetch latest revision? sloppy
                        contentRevision = await contentDB.fetchContentRevisionByID(response.history[0].id); // response.history[0]; // (await contentDB.fetchContentRevisionsByContentID(content.id))[0];
                    if(contentRevision)
                        response.revision = contentRevision;
                    response.parentList = await contentDB.selectContent("a.path IS NOT NULL", null, "id, path, title");

                    res.json(response);

                    break;
                case 'POST':
                   // Handle POST
                    let insertContentRevisionID, revision;
                    switch (req.body.action) {
                        default:
                        case 'publish':
                            if(!sessionUser || !sessionUser.isAdmin())
                                throw new Error("Not authorized");
                            const affectedRows = await contentDB.updateContent(
                                content.id,
                                req.body.title,
                                req.body.data,
                                req.body.path,
                                sessionUser.id,
                                req.body.theme,
                                req.body.flags
                            );
                            content = await contentDB.fetchContentByID(req.params.id);

                            insertContentRevisionID = await contentDB.insertContentRevision(
                                content.id,
                                req.body.title,
                                req.body.data,
                                sessionUser.id
                            );

                            return res.json({
                                redirect: content.url,
                                message: "Content published successfully.<br/>Redirecting...",
                                insertContentRevisionID: insertContentRevisionID,
                                affectedContentRows: affectedRows,
                                content
                            });

                        case 'draft':
                            insertContentRevisionID = await contentDB.insertContentRevision(
                                content.id,
                                req.body.title,
                                req.body.data,
                                sessionUser.id
                            );
                            revision = await contentDB.fetchContentRevisionByID(insertContentRevisionID);
                            return res.json({
                                redirect: content.url + '?r=' + revision.id,
                                message: "Draft saved successfully",
                                insertContentRevisionID: insertContentRevisionID,
                                content
                            });
                    }
                    break;
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    async renderContentDeleteByID(req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const contentDB = new ContentDatabase(database);
            const userDB = new UserDatabase(database);


            let content = await contentDB.fetchContentByID(req.params.id);


            switch(req.method) {
                case 'GET':
                    // Render Editor
                await ThemeAPI.send(req, res,
    `<section style="max-width: 1600px;">
    <script src="/:content/:client/content-delete.element.js"></script>
    <content-delete id="${req.params.id}"></content-editor>
</section>`);
                    break;

                case 'OPTIONS':
                    const response = {
                        message: `Delete content ID ${content.id}?`,
                        editable: false,
                        content
                    };
                    if(req.session && req.session.userID) {
                        const database = await DatabaseManager.selectDatabaseByRequest(req);
                        const userDB = new UserDatabase(database);
                        const sessionUser = await userDB.fetchUserByID(req.session.userID);
                        if (sessionUser.isAdmin() || sessionUser.id === content.user_id)
                            response.editable = true;
                    }
                    res.json(response);
                    break;

                case 'POST':
                    // Handle POST
                    if(!req.session || !req.session.userID)
                        throw new Error("Must be logged in");
                    const sessionUser = await userDB.fetchUserByID(req.session.userID);
                    if(!sessionUser || !sessionUser.isAdmin())
                        throw new Error("Not authorized");
                    // TODO: recommend articles for deletion

                    const affectedRows = await contentDB.deleteContent(
                        content.id
                    );

                    return res.json({
                        redirect: '/:content/',
                        message: "Content deleted successfully.<br/>Redirecting...",
                        affectedContentRows: affectedRows
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    async renderContentAdd(req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const contentDB = new ContentDatabase(database);
            const userDB = new UserDatabase(database);
            if(!req.session || !req.session.userID)
                throw new Error("Must be logged in");

            if(req.method === 'GET') {          // Handle GET
                // Render Editor
                await ThemeAPI.send(req, res,
`<section>
    <script src="/:content/:client/content-add.element.js"></script>
    <content-addform></content-addform>
</section>
`)

            } else {
                if(!req.session || !req.session.userID)
                    throw new Error("Must be logged in");
                const sessionUser = await userDB.fetchUserByID(req.session.userID);
                if(!sessionUser || !sessionUser.isAdmin())
                    throw new Error("Not authorized");
                // TODO: submit articles for approval

                // Handle POST
                const insertID = await contentDB.insertContent(
                    req.body.title,
                    req.body.data,
                    req.body.path,
                    sessionUser.id,
                    req.body.parent_id ? parseInt(req.body.parent_id) : null,
                    req.body.theme
                );
                const content = await contentDB.fetchContentByID(insertID);
                return res.json({
                    redirect: content.url + '/:edit',
                    message: "Content created successfully. Redirecting...",
                    insertID,
                    content
                });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    async renderContentBrowser(req, res) {
        try {

            if (req.method === 'GET') {
                await ThemeAPI.send(req, res, `
<section>
    <script src="/:content/:client/content-browser.element.js"></script>
    <content-browser></content-browser>
    <script src="/:content/:client/content-add.element.js"></script>
    <content-addform></content-addform>
</section>
`);

            } else {
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const contentDB = new ContentDatabase(database);

                // Handle POST
                let whereSQL = '1', values = null;
                if(req.body.search) {
                    whereSQL = 'a.title LIKE ? OR a.data LIKE ? OR a.path LIKE ? OR a.id = ?';
                    values = ['%'+req.body.search+'%', '%'+req.body.search+'%', '%'+req.body.search+'%', parseInt(req.body.search)];
                }
                const content = await contentDB.selectContent(whereSQL, values);

                return res.json({
                    message: `${content.length} page${content.length !== 1 ? 's' : ''} queried successfully`,
                    content
                });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async renderError(error, req, res, asJSON=false) {
        console.error(`${req.method} ${req.url}`, error);
        res.status(400);
        if(error.redirect) {
            res.redirect(error.redirect);
        } else if(req.method === 'GET' && !asJSON) {          // Handle GET
            await ThemeAPI.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
        } else {
            res.json({message: error.stack});
        }
    }
}


module.exports = {ContentAPI: new ContentApi()};

