// const formidableMiddleware = require('express-formidable');
const path = require('path');
// const fs = require('fs');
const fsPromises = require('fs').promises;
const etag = require('etag');

const multiparty = require('multiparty');

const { HTTPServer } = require('../http/http.server');
const { DatabaseManager } = require('../database/database.manager');
const { ThemeAPI } = require('../theme/theme.api');
const { ContentTable } = require("./content.table");
const { ContentRevisionTable } = require("./content_revision.table");
const { UserTable } = require("../user/user.table");
const { UserAPI } = require('../user/user.api');
const { SessionAPI } = require('../user/session/session.api');

const DIR_CONTENT = path.resolve(__dirname);

class ContentApi {
    constructor() {
    }


    getMiddleware() {
        const express = require('express');
        // const bodyParser = require('body-parser');

        const router = express.Router();
        const PM = [express.urlencoded({ extended: true }), express.json()];
        const SM = SessionAPI.getMiddleware();
        // const FM = multiparty.multipartyExpress();
        // Handle Content requests
        // router.use(                                             SM, async (req, res, next) => await this.renderContentByPath(req, res,next));
//['/[\\w/_-]+', '/'],
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


        return async (req, res, next) => {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const contentTable = new ContentTable(database);
            const content = await contentTable.fetchContentByPath(req.url, '*');
            if(content) {
                await this.checkForRevisionContent(req, content);
                return this.renderContent(req, res, content);
            }

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
        await this.renderStaticFile(req, res, next, staticFile);
    }

    async checkForRevisionContent(req, content) {
        if(typeof req.query.r !== 'undefined') {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const contentRevisionTable = new ContentRevisionTable(database);
            const contentRevisionID = parseInt(req.query.r);
            const contentRevision = await contentRevisionTable.fetchContentRevisionByID(contentRevisionID);
            if(!contentRevision)
                throw new Error("Content Revision ID not found: " + contentRevisionID);

            if(contentRevision.content_id !== content.id)
                throw new Error("Revision does not belong to content");

            content.data = await contentRevisionTable.fetchRevisionData(contentRevision.id);
            // content.title = contentRevision.title;
            return contentRevision;
        }
        return null;
    }

    // async renderContentByPath(req, res, next) {
    //     // TODO: parse session middleware only if content was found
    //     try {
    //         const database = await DatabaseManager.selectDatabaseByRequest(req);
    //         const contentTable = new ContentTable(database);
    //         const content = await contentTable.fetchContentByPath(req.url, '*');
    //         if(!content)
    //             return next();
    //
    //         await this.renderContent(req, res, content);
    //     } catch (error) {
    //         await this.renderError(error, req, res);
    //     }
    async renderContentByID(asJSON, req, res, next) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const contentTable = new ContentTable(database);
            const contentRevisionTable = new ContentRevisionTable(database);
            const content = await contentTable.fetchContentByID(req.params.id);
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
                    const userTable = new UserTable(database);
                    const sessionUser = await userTable.fetchUserByID(req.session.userID);
                    if (sessionUser.isAdmin() || sessionUser.id === content.user_id)
                        response.editable = true;
                }
                if(req.query.getAll || req.query.getHistory) {
                    response.history = await contentRevisionTable.fetchContentRevisionsByContentID(content.id);
                    // response.revision = await contentRevisionTable.fetchContentRevisionByID(content.id, req.query.getRevision || null);
                    if(!contentRevision && response.history.length > 0) // Fetch latest revision? sloppy
                        contentRevision = await contentRevisionTable.fetchContentRevisionByID(response.history[0].id); // response.history[0]; // (await contentRevisionTable.fetchContentRevisionsByContentID(content.id))[0];
                }
                if(contentRevision)
                    response.revision = contentRevision;
                if(req.query.getAll) {
                    response.parentList = await contentTable.selectContent("c.path IS NOT NULL", null, "id, path, title");
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
            const contentTable = new ContentTable(database);
            const contentRevisionTable = new ContentRevisionTable(database);
            const userTable = new UserTable(database);

            if(!req.session || !req.session.userID)
                throw new Error("Must be logged in");
            const sessionUser = await userTable.fetchUserByID(req.session.userID);

            let content = await contentTable.fetchContentByID(req.params.id);

            switch(req.method) {
                case 'GET':
                    let renderedData = null;
                    const mimeType = this.getMimeType(path.extname(content.path) || '');
                    switch(mimeType) {
                        case 'text/html':
                            renderedData = contentTable.fetchContentData(content.id, 'UTF8');
                            break;
                    }
                    // Render Editor
                    await ThemeAPI.send(req, res, {
                        title: `Edit Content #${content.id}`,
                        data: `
                <script src="/:content/:client/content-editor.element.js"></script>
                <content-editor id="${req.params.id}"></content-editor>
            
            <section class="content-preview-container">
                <h1 style="text-align: center;">Preview</h1>
                <hr/>
                <div class="content-preview-content">
                    <article>
                        ${renderedData}                
                    </article>
                </div>
            </section>
    `});
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
                        const userTable = new UserTable(database);
                        const sessionUser = await userTable.fetchUserByID(req.session.userID);
                        if (sessionUser.isAdmin() || sessionUser.id === content.user_id)
                            response.editable = true;
                    }
                    response.history = await contentRevisionTable.fetchContentRevisionsByContentID(content.id);
                    // response.revision = await contentRevisionTable.fetchContentRevisionByID(content.id, req.query.getRevision || null);
                    if(!contentRevision && response.history.length > 0) // Fetch latest revision? sloppy
                        contentRevision = await contentRevisionTable.fetchContentRevisionByID(response.history[0].id); // response.history[0]; // (await contentRevisionTable.fetchContentRevisionsByContentID(content.id))[0];
                    if(contentRevision)
                        response.revision = contentRevision;
                    response.parentList = await contentTable.selectContent("c.path IS NOT NULL", null, "id, path, title");

                    content.mimeType = this.getMimeType(path.extname(content.path) || '');
                    if(editableMimeTypes.indexOf(content.mimeType) !== -1) {
                        content.data = await contentTable.fetchContentData(content.id, 'UTF8');
                        content.isBinary = false;
                    } else {
                        content.data = '[binary file]';
                        content.isBinary = true;
                    }

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
                            const affectedRows = await contentTable.updateContent(
                                content.id,
                                req.body.title,
                                req.body.data,
                                req.body.path,
                                sessionUser.id,
                                req.body.theme,
                                req.body.flags
                            );
                            content = await contentTable.fetchContentByID(req.params.id);

                            insertContentRevisionID = await contentRevisionTable.insertContentRevision(
                                content.id,
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
                            insertContentRevisionID = await contentRevisionTable.insertContentRevision(
                                content.id,
                                req.body.data,
                                sessionUser.id
                            );
                            revision = await contentRevisionTable.fetchContentRevisionByID(insertContentRevisionID);
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
            const contentTable = new ContentTable(database);
            const userTable = new UserTable(database);


            let content = await contentTable.fetchContentByID(req.params.id);


            switch(req.method) {
                case 'GET':
                    // Render Editor
                await ThemeAPI.send(req, res, {
                    title: `Delete Content #${content.id}`,
                    data: `
    <script src="/:content/:client/content-delete.element.js"></script>
    <content-delete id="${req.params.id}"></content-editor>
`
                });
                    break;

                default:
                case 'OPTIONS':

                    if(editableMimeTypes.indexOf(content.mimeType) !== -1) {
                        content.data = await contentTable.fetchContentData(content.id, 'UTF8');
                        content.isBinary = false;
                    } else {
                        content.data = '[binary file]';
                        content.isBinary = true;
                    }

                    const response = {
                        message: `Delete content ID ${content.id}?`,
                        editable: false,
                        content
                    };
                    if(req.session && req.session.userID) {
                        const database = await DatabaseManager.selectDatabaseByRequest(req);
                        const userTable = new UserTable(database);
                        const sessionUser = await userTable.fetchUserByID(req.session.userID);
                        if (sessionUser.isAdmin() || sessionUser.id === content.user_id)
                            response.editable = true;
                    }
                    res.json(response);
                    break;

                case 'POST':
                    // Handle POST
                    if(!req.session || !req.session.userID)
                        throw new Error("Must be logged in");
                    const sessionUser = await userTable.fetchUserByID(req.session.userID);
                    if(!sessionUser || !sessionUser.isAdmin())
                        throw new Error("Not authorized");
                    // TODO: recommend articles for deletion

                    const affectedRows = await contentTable.deleteContent(
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
            const contentTable = new ContentTable(database);
            const contentRevisionTable = new ContentRevisionTable(database);
            const userTable = new UserTable(database);
            if(!req.session || !req.session.userID)
                throw new Error("Must be logged in");
            const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;

            const currentUploads = req.session.uploads || [];

            switch(req.method) {
                case 'GET':
                    // Render Editor
                    return await ThemeAPI.send(req, res,
                        {
                            title: `Add New Content`,
                            data: `
    <script src="/:content/:client/content-add.element.js"></script>
    <content-addform></content-addform>
    <script src="/:content/:client/content-upload.element.js"></script>
    <content-uploadform></content-uploadform>

`});

                default:
                case 'OPTIONS':
                    // const currentCount = req.session.uploads ? req.session.uploads.length : 0;
                    let editable = sessionUser && sessionUser.isAdmin();
                    let message = `${currentUploads.length} temporary file${currentUploads.length!== 1 ? 's' : ''} available`;
                    if(!sessionUser)
                        message = `Must be logged in to create new content`;
                    if(!sessionUser.isAdmin())
                        message = `Only administrators may create new content`;

                    return res.json({
                        editable,
                        message,
                        status: editable ? 200 : 400,
                        // message: `${currentCount} temporary file${currentCount !== 1 ? 's' : ''} uploaded`,
                        currentUploads: currentUploads
                            .map(uploadEntry => { return {
                                name: uploadEntry.originalFilename,
                                size: uploadEntry.size
                            }})
                    });

                case 'POST':
                    // Handle POST
                    if(!sessionUser || !sessionUser.isAdmin())
                        throw new Error("Not authorized");
                    // TODO: submit articles for approval? No, it would flood the hostmaster with requests

                    const insertIDs = [];
                    for(let i=0; i<req.body.content.length; i++) {
                        let contentData = req.body.content[i];
                        if(!contentData.title)
                            throw new Error("Invalid Title: " + i);
                        if(!contentData.path)
                            throw new Error("Invalid Path: " + i)
                        if(contentData.data) {
                            const dataMethod = contentData.data.split(':');
                            contentData.data = null;
                            switch (dataMethod[0]) {
                                case 'temp':
                                    const tempFileName = dataMethod[1];
                                    const tempFilePos = currentUploads.findIndex(upload => upload.originalFilename === tempFileName);
                                    if(tempFilePos === -1)
                                        throw new Error("Temporary file not found: " + tempFileName);
                                    contentData.data = await fsPromises.readFile(currentUploads[tempFilePos].path);
                                    currentUploads.splice(tempFilePos, 1);
                                    break;
                                default:
                                    throw new Error("Invalid data upload method: " + dataMethod);
                            }
                        }

                        const insertID = await contentTable.updateContentWithRevision(
                            contentData.title,
                            contentData.data,
                            contentData.path,
                            sessionUser.id,
                            // req.body.parent_id ? parseInt(req.body.parent_id) : null,
                            contentData.theme
                        );
                        insertIDs.push(insertID);

                        // Initial revision shouldn't be created until first edit has been made
                        // const contentEntry = await contentTable.fetchContentByID(insertID);
                        //
                        // const insertRevisionID = await contentRevisionTable.insertContentRevision(
                        //     contentEntry.id,
                        //     contentData.title,
                        //     contentData.data,
                        //     sessionUser.id
                        // );
                        // insertRevisionIDs.push(insertRevisionID);
                    }


                    return res.json({
                        redirect: '/:content',
                        message: `${insertIDs} Content Entr${insertIDs.length === 1 ? 'y' : 'ies'} created successfully.`,
                        insertIDs,
                        // insertRevisionIDs,
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    async renderContentUpload(req, res) {
        try {
            // const database = await DatabaseManager.selectDatabaseByRequest(req);
            // const contentTable = new ContentTable(database);
            // const userTable = new UserTable(database);
            if(!req.session)
                throw new Error("Session is not available");

            if(typeof req.session.uploads === "undefined")
                req.session.uploads = [];
            let currentCount = req.session.uploads ? req.session.uploads.length : 0;

            switch(req.method) {
                case 'GET':
                    // Render Editor
                    await ThemeAPI.send(req, res, {
                            title: `Upload Content`,
                            data: `
        <script src="/:content/:client/content-upload.element.js"></script>
        <content-uploadform></content-uploadform>
    
    `})
                    break;

                default:
                case 'OPTIONS':

                    return res.json({
                        message: `${currentCount} temporary file upload${currentCount !== 1 ? 's' : ''} available`,
                        currentUploads: req.session.uploads
                            .map(uploadEntry => { return {
                                name: uploadEntry.originalFilename,
                                size: uploadEntry.size
                            }})
                    });

                case 'POST':
                    const currentUploads = req.session.uploads;
                    let message = '';
                    const newUploads = [];
                    if(Object.values(req.body).length > 0) {
                        let deletePositions = req.body.delete;
                        if(deletePositions) {
                            deletePositions = deletePositions.map(p => parseInt(p));
                            deletePositions.sort((a,b) => b-a);
                            for (let i=0; i<deletePositions.length; i++) {
                                const deletedFile = currentUploads.splice(deletePositions[i], 1)[0];
                                try {
                                    await fsPromises.unlink(deletedFile.path);
                                } catch (e) {
                                    console.warn(e);
                                }
                            }
                        }
                        message += `${deletePositions.length} temporary file${deletePositions.length !== 1 ? 's' : ''} deleted. `;
                        // Handle JSON Form
                    } else {
                        // Handle File Upload Form
                        const { files, fields } = await this.parseFileUploads(req);
                        if(!files || !fields) {
                            throw new Error("Uploads not available");

                        }
                        const uploadCount = Object.values(files).length;

                        if(uploadCount === 0)
                            throw new Error("No files were uploaded");
                        for(let i=0; i<files.length; i++) {
                            const uploadEntry = {
                                originalFilename: files[i].originalFilename,
                                path: files[i].path,
                                size: files[i].size,
                            };
                            newUploads.push(uploadEntry);
                            const pos = currentUploads.findIndex(searchUploadEntry => searchUploadEntry.originalFilename === uploadEntry.originalFilename);
                            if(pos >= 0) {
                                currentUploads[pos] = uploadEntry;
                            } else {
                                currentUploads.push(uploadEntry)
                            }
                        }
                        currentCount = req.session.uploads ? req.session.uploads.length : 0;
                        message += `${uploadCount} temporary file${uploadCount !== 1 ? 's' : ''} uploaded. ${currentCount} files available.`;
                    }


                    return res.json({
                        message: message,
                        newUploads: newUploads
                            .map(uploadEntry => { return {
                                name: uploadEntry.originalFilename,
                                size: uploadEntry.size
                            }}),
                        currentUploads: req.session.uploads
                            .map(uploadEntry => { return {
                                name: uploadEntry.originalFilename,
                                size: uploadEntry.size
                            }})
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async renderContentList(req, res) {
        try {

            if (req.method === 'GET') {
                await ThemeAPI.send(req, res, {
                    title: `Site Index`,
                    data: `

    <script src="/:content/:client/content-browser.element.js"></script>
    <content-browser></content-browser>
    <script src="/:content/:client/content-add.element.js"></script>
    <content-addform></content-addform>
    <script src="/:content/:client/content-upload.element.js"></script>
    <content-uploadform></content-uploadform>


`});

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
            const contentTable = new ContentTable(database);

            // Handle POST
            let whereSQL = '1', values = null;
            const search = req.body ? req.body.search : (req.query ? req.query.search : null);
            if(search) {
                whereSQL = 'c.title LIKE ? OR c.data LIKE ? OR c.path LIKE ? OR c.id = ?';
                values = ['%'+search+'%', '%'+search+'%', '%'+search+'%', parseInt(search)];
            }
            const contentList = await contentTable.selectContent(whereSQL, values, 'id, path, title');

            return res.json({
                message: `${contentList.length} content entr${contentList.length !== 1 ? 'ies' : 'y'} queried successfully`,
                contentList
            });
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    // }
    async renderContent(req, res, content) {
        const mimeType = this.getMimeType(path.extname(content.path) || '');
        switch(mimeType) {
            case 'text/html':
                content.data = content.data.toString('UTF8');
                const firstTag = content.data.match(/<([^>]+)/)[1].toLowerCase();
                switch(firstTag) {
                    case 'body':
                    case 'html':
                        await this.renderData(req, res, content.data, mimeType, content.updated);
                        break;

                    default:
                        // Load session if we're using the theme
                        const SM = SessionAPI.getMiddleware();
                        SM(req, res, () => {
                            ThemeAPI.send(req, res, content);
                        });
                }
                break;
            default:
                await this.renderData(req, res, content.data, mimeType, content.updated);
                break;
        }
    }

    async renderData(req, res, data, mimeType, lastModified) {
        const newETAG = etag(data);

        //check if if-modified-since header is the same as the mtime of the file
        if (req.headers["if-none-match"]) {
            //Get the if-modified-since header from the request
            const oldETAG = req.headers["if-none-match"];
            if (oldETAG === newETAG) {
                res.writeHead(304, {"Last-Modified": lastModified.toUTCString()});
                res.end();
                return true;
            }
        }

        res.setHeader('Last-Modified', lastModified.toUTCString());
        res.setHeader('Content-type', mimeType );
        res.setHeader('ETag', newETAG);
        res.end(data);

    }

    // TODO: render static data
    async renderStaticFile(req, res, next, filePath) {
        const ext = path.extname(filePath);

        let stats = null;
        try {
            stats = await fsPromises.stat(filePath);
        } catch (e) {
            if(e.code === 'ENOENT')
                return next();
            throw e;
        }

        // if(!await fsPromises.exist(filePath))
        //     return next();



        //check if if-modified-since header is the same as the mtime of the file
        if (req.headers["if-modified-since"]) {
            //Get the if-modified-since header from the request
            const reqModDate = new Date(req.headers["if-modified-since"]);
            if (reqModDate.getTime() === stats.mtime.getTime()) {
                res.writeHead(304, {"Last-Modified": stats.mtime.toUTCString()});
                res.end();
                return true;
            }
        }

        try {
            const data = await fsPromises.readFile(filePath);
            await this.renderData(req, res, data, this.getMimeType(ext), stats.mtime);
            // if the file is found, set Content-type and send data
            // res.setHeader("Expires", new Date(Date.now() + 1000 * 60 * 60 * 24).toUTCString()); // Static files deserve long term caching
        } catch (err) {
            res.statusCode = 500;
            res.end(`Error reading file: ${err}.`);
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


    async renderError(error, req, res, json=null) {
        console.error(`${req.method} ${req.url} ${error.message}`, error);
        res.status(400);
        if(error.redirect) {
            res.redirect(error.redirect);
        } else if(req.method === 'GET' && !json) {
            await ThemeAPI.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
        } else {
            res.json(Object.assign({}, {
                message: error.message,
                error: error.stack,
                code: error.code,
            }, json));
        }
    }

    getMimeType(ext) {
        if(typeof mapMimeTypes[ext] !== 'undefined')
            return mapMimeTypes[ext];
        return null;
    }
}


module.exports = {ContentAPI: new ContentApi()};

// maps file extention to MIME TYPE
const mapMimeTypes = {
    '': 'text/html',
    '.htm': 'text/html',
    '.html': 'text/html',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.xml': 'application/xml'
};

const editableMimeTypes = [
    'image/x-icon',
    'text/html',
    'text/javascript',
    'application/json',
    'text/css',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/xml'
];

