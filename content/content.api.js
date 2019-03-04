// const formidableMiddleware = require('express-formidable');
const path = require('path');

const multiparty = require('multiparty');

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
        // const FM = multiparty.multipartyExpress();
        // Handle Content requests
        router.get(['/[\\w/_-]+', '/'],                         SM, async (req, res, next) => await this.renderContentByPath(req, res,next));

        router.get('/[:]content/:id/[:]json',                   SM, async (req, res, next) => await this.renderContentByID(true, req, res, next));
        router.get(['/[:]content/:id/view', '/[:]content/:id'], SM, async (req, res, next) => await this.renderContentByID(false, req, res, next));
        router.get('/[:]content/[:]json',                       SM, async (req, res) => await this.renderContentListJSON(req, res));
        // TODO: sync

        router.all('/[:]content/:id/[:]edit',                   SM, PM, async (req, res) => await this.renderContentEditorByID(req, res));
        router.all('/[:]content/:id/[:]delete',                 SM, PM, async (req, res) => await this.renderContentDeleteByID(req, res));
        router.all('/[:]content/[:]add',                        SM, PM, async (req, res) => await this.renderContentAdd(req, res));
        router.all('/[:]content/[:]upload',                     SM, PM, async (req, res) => await this.renderContentUpload(req, res));
        router.all(['/[:]content', '/[:]content/[:]list'],      SM, PM, async (req, res) => await this.renderContentList(req, res));


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
                    response.parentList = await contentDB.selectContent("c.path IS NOT NULL", null, "id, path, title");
                }

                res.json(response);

            } else {
                await ThemeAPI.send(req, res, content);
            }
        } catch (error) {
            await this.renderError(error, req, res, asJSON ? {} : null);
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

                default:
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
                    response.parentList = await contentDB.selectContent("c.path IS NOT NULL", null, "id, path, title");

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

                default:
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
    <script src="/:content/:client/content-upload.element.js"></script>
    <content-uploadform></content-uploadform>
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
                    // sessionUser.id,
                    // req.body.parent_id ? parseInt(req.body.parent_id) : null,
                    req.body.theme
                );
                const content = await contentDB.fetchContentByID(insertID);

                const insertContentRevisionID = await contentDB.insertContentRevision(
                    content.id,
                    req.body.title,
                    req.body.data,
                    sessionUser.id
                );
                return res.json({
                    redirect: content.url + '/:edit',
                    message: "Content created successfully. Redirecting...",
                    insertID,
                    insertContentRevisionID,
                    content
                });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    async renderContentUpload(req, res) {
        try {
            // const database = await DatabaseManager.selectDatabaseByRequest(req);
            // const contentDB = new ContentDatabase(database);
            // const userDB = new UserDatabase(database);
            switch(req.method) {
                case 'GET':
                    // Render Editor
                    await ThemeAPI.send(req, res,
                        `<section>
        <script src="/:content/:client/content-upload.element.js"></script>
        <content-uploadform></content-uploadform>
    </section>
    `)
                    break;

                default:
                case 'OPTIONS':
                    const currentCount = req.session.uploads ? req.session.uploads.length : 0;

                    return res.json({
                        message: `${currentCount} temporary file${currentCount !== 1 ? 's' : ''} available`,
                        currentUploads: req.session.uploads
                    });

                case 'POST':
                    if(!req.session)
                        throw new Error("Session is not available");

                    const { files, fields } = await this.parseFileUploads(req);
                    if(!files)
                        throw new Error("Uploads not available");

                    const uploadCount = Object.values(files).length;
                    if(uploadCount === 0)
                        throw new Error("No files were uploaded");


                    if(typeof req.session.uploads === "undefined")
                        req.session.uploads = [];
                    const currentUploads = req.session.uploads;
                    for(let i=0; i<files.length; i++) {
                        const uploadEntry = {
                            originalFilename: files[i].originalFilename,
                            path: files[i].path,
                            size: files[i].size,
                        };
                        const pos = currentUploads.findIndex(searchUploadEntry => searchUploadEntry.originalFilename === uploadEntry.originalFilename);
                        if(pos >= 0) {
                            currentUploads[pos] = uploadEntry;
                        } else {
                            currentUploads.push(uploadEntry)
                        }
                    }

                    return res.json({
                        message: `${uploadCount} temporary file${uploadCount !== 1 ? 's' : ''} uploaded successfully. Redirecting...`,
                        files: files,
                        currentUploads: req.session.uploads
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async renderContentList(req, res) {
        try {

            if (req.method === 'GET') {
                await ThemeAPI.send(req, res, `
<section>
    <script src="/:content/:client/content-browser.element.js"></script>
    <content-browser></content-browser>
    <script src="/:content/:client/content-add.element.js"></script>
    <content-addform></content-addform>
    <script src="/:content/:client/content-upload.element.js"></script>
    <content-uploadform></content-uploadform>

</section>
`);

            } else {
                return await this.renderContentListJSON(req, res);
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async renderContentListJSON(req, res) {
        try {

            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const contentDB = new ContentDatabase(database);

            // Handle POST
            let whereSQL = '1', values = null;
            const search = req.body ? req.body.search : (req.query ? req.query.search : null);
            if(search) {
                whereSQL = 'c.title LIKE ? OR c.data LIKE ? OR c.path LIKE ? OR c.id = ?';
                values = ['%'+search+'%', '%'+search+'%', '%'+search+'%', parseInt(search)];
            }
            const contentList = await contentDB.selectContent(whereSQL, values, 'id, path, title');

            return res.json({
                message: `${contentList.length} content entr${contentList.length !== 1 ? 'ies' : 'y'} queried successfully`,
                contentList
            });
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async parseFileUploads(req) {
        return new Promise( ( resolve, reject ) => {
            var form = new multiparty.Form();

            form.parse(req, function(err, fields, files) {
                resolve ({fields, files: files && files.files ? files.files : null});
                // res.writeHead(200, {'content-type': 'text/plain'});
                // res.write('received upload:\n\n');
                // res.end(util.inspect({fields: fields, files: files}));
            });
        });
    }

    calculateFileHash(filePath) {
        return new Promise( ( resolve, reject ) => {
            fs.createReadStream(filePath).
            pipe(crypto.createHash('sha1').setEncoding('hex')).
            on('finish', function () {
                resolve (this.read()) //the hash
            })
                .on('error', reject);
        });
    }

    readFileContent(filePath, options=null) {
        return new Promise( ( resolve, reject ) => {
            fs.readFile(filePath, options, (err, contents) => {
                err ? reject (err) : resolve (contents);
            });
        });
    }

    readFileStats(filePath) {
        return new Promise( ( resolve, reject ) => {
            fs.stat(filePath, (err, stats) => {
                err ? reject (err) : resolve (stats);
            });
        });
    }

    async renderError(error, req, res, json=null) {
        console.error(`${req.method} ${req.url} ${error.message}`);
        res.status(400);
        if(error.redirect) {
            res.redirect(error.redirect);
        } else if(req.method === 'GET' && !json) {
            await ThemeAPI.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
        } else {
            res.json(Object.assign({}, {
                message: `${req.method} ${req.url} ${error.message}`,
                error: error.stack,
                code: error.code,
            }, json));
        }
    }
}


module.exports = {ContentAPI: new ContentApi()};

