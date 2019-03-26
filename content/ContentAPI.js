const mime = require('mime');
const path = require('path');
const fs = require('fs');

const multiparty = require('multiparty');


const ContentRenderer = require('./ContentRenderer');
const ContentTable = require("./ContentTable");
const ContentRevisionTable = require("./revision/ContentRevisionTable");
const UserTable = require("../user/UserTable");
// const SessionAPI = require("../user/session/SessionAPI");

const DIR_CONTENT = path.resolve(__dirname);


// TODO: move / rename multi, check for references to path links
class ContentAPI {
    constructor() {
    }

    async configure(interactive=false) {
    }

    getMiddleware() {
        const express = require('express');
        // const bodyParser = require('body-parser');

        const router = express.Router();
        const PM = [express.urlencoded({ extended: true }), express.json()];
        // const SM = new SessionAPI().getMiddleware();
        // const FM = multiparty.multipartyExpress();
        // Handle Content requests
        // router.use(                                             async (req, res, next) => await this.renderContentByPath(req, res,next));
//['/[\\w/_-]+', '/'],
        router.get('/[:]content/:id/[:]json',                       async (req, res, next) => await this.renderContentByID(true, req, res, next));
        router.get(['/[:]content/:id/view', '/[:]content/:id'],     async (req, res, next) => await this.renderContentByID(false, req, res, next));
        router.get('/[:]content/[:]json',                           async (req, res) => await this.renderContentListJSON(req, res));
        // TODO: sync

        router.all('/[:]content/:id/[:]edit',                       PM, async (req, res) => await this.renderContentEditorByID(req, res));
        router.all('/[:]content/:id/[:]delete',                     PM, async (req, res) => await this.renderContentDeleteByID(req, res));
        router.all('/[:]content/[:]add',                            PM, async (req, res) => await this.renderContentAdd(req, res));
        router.all('/[:]content/[:]upload',                         PM, async (req, res) => await this.renderContentUpload(req, res));
        router.all(['/[:]content', '/[:]content/[:]list'],          PM, async (req, res) => await this.renderContentList(req, res));


        // User Asset files
        router.get('/[:]content/[:]client/*',                       async (req, res, next) => await this.handleContentStaticFiles(req, res, next));


        return async (req, res, next) => {
            // const database = await req.server.selectDatabaseByRequest(req);
            const contentTable = new ContentTable(req.database, req.server.dbClient);
            const content = await contentTable.fetchContentByPath(req.url, '*');
            if(content) {
                await this.checkForRevisionContent(req, content);

                // const mimeType = this.getMimeType(path.extname(content.path) || '');
                switch(content.mimeType) {
                    case null:
                    case 'text/html':
                        // Load session if we're using the theme
                        // const SM = new SessionAPI().getMiddleware();
                        // SM(req, res, async () => {
                        await ContentRenderer.send(req, res, content);
                        // });
                        return;
                    default:
                        await this.renderData(req, res, content.data, content.mimeType, content.updated);
                        return;
                }
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
            // const database = await req.server.selectDatabaseByRequest(req);
            const contentRevisionTable = new ContentRevisionTable(req.database, req.server.dbClient);
            const contentRevisionID = parseInt(req.query.r);
            const contentRevision = await contentRevisionTable.fetchContentRevisionByID(contentRevisionID);
            if(!contentRevision)
                throw new Error("Content Revision ID not found: " + contentRevisionID);

            if(contentRevision.content_id !== content.id)
                throw new Error("Revision does not belong to content");

            // content.data = await contentRevisionTable.fetchRevisionData(contentRevision.id);
            // content.title = contentRevision.title;
            return contentRevision;
        }
        return null;
    }

    async renderContentByID(asJSON, req, res, next) {
        try {
            // const database = await req.server.selectDatabaseByRequest(req);
            const contentTable = new ContentTable(req.database, req.server.dbClient);
            const contentRevisionTable = new ContentRevisionTable(req.database, req.server.dbClient);
            const content = await contentTable.fetchContentByID(req.params.id, '*');
            if(!content)
                return next();

            let contentRevision = await this.checkForRevisionContent(req, content);
            if(contentRevision)
                content.data = await contentRevisionTable.fetchRevisionData(contentRevision.id, 'UTF8');

            if(asJSON) {
                const response = {
                    redirect: content.url,
                    message: "Content Queried Successfully",
                    editable: false,
                    content
                };
                if(req.session && req.session.userID) {
                    // const database = await req.server.selectDatabaseByRequest(req);
                    const userTable = new UserTable(req.database, req.server.dbClient);
                    const sessionUser = await userTable.fetchUserByID(req.session.userID);
                    if (sessionUser.isAdmin() || sessionUser.id === content.user_id)
                        response.editable = true;
                }
                if(req.query.getAll || req.query.getHistory) {
                    response.history = await contentRevisionTable.fetchContentRevisionsByContentID(content.id);
                    // response.revision = await contentRevisionTable.fetchContentRevisionByID(content.id, req.query.getRevision || null);
                    // if(!contentRevision && response.history.length > 0) // Fetch latest revision? sloppy
                        // contentRevision = await contentRevisionTable.fetchContentRevisionByID(response.history[0].id); // response.history[0]; // (await contentRevisionTable.fetchContentRevisionsByContentID(content.id))[0];
                }
                // if(contentRevision)
                //     response.data = contentRevision.data;
                if(req.query.getAll) {
                    // response.parentList = await contentTable.selectContent("c.path IS NOT NULL", null, "id, path, title");
                }

                res.json(response);

            } else {

                // Load session if we're using the theme
                // const SM = new SessionAPI().getMiddleware();
                // SM(req, res, async () => {
                    // const mimeType = this.getMimeType(path.extname(content.path) || '');
                switch(content.mimeType) {
                    case null:
                    case 'text/html':
                        await ContentRenderer.send(req, res, content);
                        break;
                    default:
                        // if(this.isMimeTypeRenderable(content.mimeType)) {
                            await ContentRenderer.send(req, res, Object.assign({}, content, {
                                data: `<iframe src="${content.path}" style="width: 100%; height: 100%; border: 0;"></iframe>`
                            }));
                        // } else {
                        //     await ContentRenderer.send(req, res, Object.assign({}, content, {
                        //         data: `<section><div class="message"><a href="${content.path}">Download (${content.title})</a></div></section>`
                        //     }));
                        // }
                        break;
                }
                // });
            }
        } catch (error) {
            await this.renderError(error, req, res, asJSON ? {} : null);
        }
    }


    async renderContentEditorByID(req, res) {
        try {
            // const database = await req.server.selectDatabaseByRequest(req);
            const contentTable = new ContentTable(req.database, req.server.dbClient);
            const contentRevisionTable = new ContentRevisionTable(req.database, req.server.dbClient);
            const userTable = new UserTable(req.database, req.server.dbClient);

            let content = await contentTable.fetchContentByID(req.params.id, 'c.*, NULL as data, LENGTH(data) as "length"');
            const currentUploads = req.session.uploads || [];

            switch(req.method) {
                case 'GET':
                    // let renderedData = null;
                    // const mimeType = this.getMimeType(path.extname(content.path) || '');
                    // switch(content.mimeType) {
                    //     case 'text/html':
                    //         // renderedData = ContentTable.fetchContentData(content.id, 'UTF8');
                    //         break;
                    // }
                    // Render Editor
                    await ContentRenderer.send(req, res, {
                        title: `Edit Content #${content.id}`,
                        data: `
            <content-form-editor id="${req.params.id}"></content-form-editor>
    `});
                    break;

                default:
                case 'OPTIONS':


                    const response = {
                        redirect: content.url,
                        message: "Content Queried Successfully",
                        editable: false,
                        content,
                        currentUploads,
                        isBinary: false,
                        mimeType: content.mimeType || 'text/html'
                    };

                    let contentRevision = await this.checkForRevisionContent(req, content);
                    if(contentRevision) {
                        if(this.isMimeTypeEditable(response.mimeType)) {
                            contentRevision.data = await contentRevisionTable.fetchRevisionData(contentRevision.id, 'UTF8');
                        }
                    }
                    response.contentRevision = contentRevision;

                    if(req.session && req.session.userID) {
                        const sessionUser = await userTable.fetchUserByID(req.session.userID);
                        if (sessionUser && sessionUser.isAdmin())
                            response.editable = true;
                    }
                    if(!response.editable)
                        response.message = 'Administrator access required to modify content';

                    response.history = await contentRevisionTable.fetchContentRevisionsByContentID(content.id);
                    // response.revision = await contentRevisionTable.fetchContentRevisionByID(content.id, req.query.getRevision || null);
                    // if(!contentRevision && response.history.length > 0) // Fetch latest revision? sloppy
                    //     contentRevision = await contentRevisionTable.fetchContentRevisionByID(response.history[0].id); // response.history[0]; // (await contentRevisionTable.fetchContentRevisionsByContentID(content.id))[0];
                    // if(contentRevision)
                    //     response.revision = contentRevision;
                    // response.parentList = await contentTable.selectContent("c.path IS NOT NULL", null, "id, path, title");

                    // content.mimeType = this.getMimeType(path.extname(content.path) || '');
                    if(this.isMimeTypeEditable(response.mimeType)) {
                        content.data = await contentTable.fetchContentData(content.id, 'UTF8');
                    } else {
                        content.data = null; // `[Binary File]\nMime Type: ${content.mimeType}\nLength: ${this.readableByteSize(content.length)}`;
                        response.isBinary = true;
                    }

                    res.json(response);

                    break;
                case 'POST':
                    // Handle POST
                    let newContentData = req.body.data;
                    switch((req.body.encoding || '').toLowerCase()) {
                        case 'base64':
                            newContentData = Buffer.from(newContentData,"base64");
                            break;
                    }

                    // Check for file revision change

                    if(req.body.revisionID && !this.isMimeTypeEditable(content.mimeType)) {
                        newContentData = await contentRevisionTable.fetchRevisionData(req.body.revisionID)
                    }

                    switch (req.body.action) {
                        default:
                        case 'publish':
                            if(!req.session || !req.session.userID)
                                throw new Error("Must be logged in");
                            const sessionUser = await userTable.fetchUserByID(req.session.userID);
                            if(!sessionUser || !sessionUser.isAdmin())
                                throw new Error("Not authorized");

                            const oldContentData = await contentTable.fetchContentData(content.id);
                            const contentMatches = newContentData.toString('UTF8') === oldContentData.toString('UTF8');

                            if(req.body.path === content.path
                                && req.body.title === content.title
                                && contentMatches
                                && sessionUser.id === content.user_id) {
                                return res.status(400).json({
                                    // redirect: content.url,
                                    message: "Content matches. No changes detected",
                                    affectedContentRows: 0,
                                    // content: content // causes problems
                                });
                            }
                            const affectedRows = await contentTable.updateContent(content.id, req.body.path, req.body.title, newContentData, sessionUser.id);

                            // Insert revision for old content
                            if(contentMatches) {
                                console.warn("Old content matches new. Skipping revision");
                            } else {
                                await contentRevisionTable.insertContentRevision(
                                    content.id,
                                    oldContentData,                 // Old Data
                                    content.user_id || null     // Old User
                                );
                            }

                            return res.json({
                                redirect: content.url,
                                message: "Content published successfully.<br/>Redirecting...",
                                affectedContentRows: affectedRows,
                                // content: content // causes problems
                            });

                        case 'draft':
                            const insertContentRevisionID = await contentRevisionTable.insertContentRevision(
                                content.id,
                                newContentData,
                                sessionUser.id
                            );
                            // revision = await contentRevisionTable.fetchContentRevisionByID(insertContentRevisionID);
                            return res.json({
                                redirect: content.url + '?r=' + insertContentRevisionID,
                                message: "Draft saved successfully",
                                content
                            });
                    }
                    break;
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    async renderContentAdd(req, res) {
        try {
            // const database = await req.server.selectDatabaseByRequest(req);
            const contentTable = new ContentTable(req.database, req.server.dbClient);
            // const contentRevisionTable = new ContentRevisionTable(req.database, req.server.dbClient);
            const userTable = new UserTable(req.database, req.server.dbClient);

            const currentUploads = req.session.uploads || [];
            let sessionUser = null;

            switch(req.method) {
                case 'GET':
                    // Render Editor
                    return await ContentRenderer.send(req, res,
                        {
                            title: `Add New Content`,
                            data: `
    <content-form-add></content-form-add>
    <content-form-upload></content-form-upload>
`
                        });

                default:
                case 'OPTIONS':
                    // if(!req.session || !req.session.userID)
                    //     throw new Error("Must be logged in");
                    sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;

                    // const currentCount = req.session.uploads ? req.session.uploads.length : 0;
                    let editable = sessionUser && sessionUser.isAdmin();
                    let message = `${currentUploads.length} temporary file upload${currentUploads.length!== 1 ? 's' : ''} available`;
                    if(!sessionUser) {
                        message = `Must be logged in to create new content`;
                    } else {
                        if(!sessionUser.isAdmin())
                            message = `Only administrators may create new content`;
                    }

                    return res.json({
                        editable,
                        message,
                        status: 0,
                        // message: `${currentCount} temporary file${currentCount !== 1 ? 's' : ''} uploaded`,
                        currentUploads
                    });

                case 'POST':
                    // Handle POST
                    if(!req.session || !req.session.userID)
                        throw new Error("Must be logged in");
                    sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;
                    if(!sessionUser || !sessionUser.isAdmin())
                        throw new Error("Not authorized");
                    // TODO: submit articles for approval? No, it would flood the hostmaster with requests

                    const insertIDs = [];
                    for(let i=0; i<req.body.content.length; i++) {
                        let contentData = req.body.content[i];
                        if(!contentData.title && !contentData.path)
                            continue;
                        if(!contentData.title)
                            throw new Error("Invalid Title: " + i);
                        if(!contentData.path)
                            throw new Error("Invalid Path: " + i)
                        if(contentData.dataSource) {
                            const dataMethod = contentData.dataSource.split(':');
                            contentData.data = null;
                            switch (dataMethod[0]) {
                                case 'temp':
                                    const tempFileUploadPath = dataMethod[1];
                                    const tempFilePos = currentUploads.findIndex(upload => upload.uploadPath === tempFileUploadPath);
                                    if(tempFilePos === -1)
                                        throw new Error("Temporary file not found: " + tempFileUploadPath);
                                    contentData.data = await this.readFileAsync(currentUploads[tempFilePos].tmpPath);
                                    currentUploads.splice(tempFilePos, 1);
                                    break;
                                default:
                                    throw new Error("Invalid data upload method: " + dataMethod);
                            }
                        }

                        const insertID = await contentTable.insertOrUpdateContentWithRevision(contentData.path, contentData.title, contentData.data, sessionUser.id);
                        insertIDs.push(insertID);

                        // Initial revision shouldn't be created until first edit has been made
                    }


                    return res.json({
                        redirect: '/:content',
                        message: `${insertIDs.length} Content Entr${insertIDs.length === 1 ? 'y' : 'ies'} created.`,
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
            // const database = await req.server.selectDatabaseByRequest(req);
            // const contentTable = new ContentTable(req.database, req.server.dbClient);
            // const userTable = new UserTable(req.database, req.server.dbClient);
            if(!req.session)
                throw new Error("Session is not available");

            if(typeof req.session.uploads === "undefined")
                req.session.uploads = [];
            let currentCount = req.session.uploads ? req.session.uploads.length : 0;

            switch(req.method) {
                case 'GET':
                    // Render Editor
                    await ContentRenderer.send(req, res, {
                        title: `Upload Content`,
                        data: `<content-form-upload></content-form-upload>`
                    })
                    break;

                default:
                case 'OPTIONS':

                    return res.json({
                        message: `${currentCount} temporary file upload${currentCount !== 1 ? 's' : ''} available`,
                        status: 0,
                        currentUploads: req.session.uploads
                    });

                case 'POST':
                    // const currentUploads = req.session.uploads;
                    let message = '';
                    const newUploads = [];
                    if(Object.values(req.body).length > 0) {
                        let deletePositions = req.body.delete;
                        if(deletePositions) {
                            deletePositions = deletePositions.map(p => parseInt(p));
                            deletePositions.sort((a,b) => b-a);
                            for (let i=0; i<deletePositions.length; i++) {
                                const deletedFile = req.session.uploads.splice(deletePositions[i], 1)[0];
                                try {
                                    await this.unlinkFileAsync(deletedFile.tmpPath);
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

                        let uploadPath = fields.uploadPath[0];
                        if(!uploadPath)
                            throw new Error("Upload path required");
                        if(uploadPath[uploadPath.length-1] !== '/')
                            uploadPath += '/';

                        for(let i=0; i<files.length; i++) {
                            const uploadEntry = {
                                // originalFilename: files[i].originalFilename,
                                tmpPath: files[i].path,
                                uploadPath: uploadPath + files[i].originalFilename,
                                size: files[i].size,
                            };
                            newUploads.push(uploadEntry);
                            const pos = req.session.uploads.findIndex(searchUploadEntry => searchUploadEntry.uploadPath === uploadEntry.uploadPath);
                            if(pos >= 0) {
                                req.session.uploads[pos] = uploadEntry;
                            } else {
                                req.session.uploads.push(uploadEntry)
                            }
                        }
                        if(req.session.uploads.length === 0)
                            throw new Error("Files failed to upload");
                        currentCount = req.session.uploads ? req.session.uploads.length : 0;
                        message += `${uploadCount} temporary file${uploadCount !== 1 ? 's' : ''} uploaded. ${currentCount} files available.`;
                    }


                    return res.json({
                        message: message,
                        newUploads: newUploads,
                        currentUploads: req.session.uploads
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async renderContentDeleteByID(req, res) {
        try {
            // const database = await req.server.selectDatabaseByRequest(req);
            const contentTable = new ContentTable(req.database, req.server.dbClient);
            const userTable = new UserTable(req.database, req.server.dbClient);


            let content = await contentTable.fetchContentByID(req.params.id);


            switch(req.method) {
                case 'GET':
                    // Render Editor
                await ContentRenderer.send(req, res, {
                    title: `Delete Content #${content.id}`,
                    data: `<content-form-delete id="${req.params.id}"></content-form-editor>`
                });
                    break;

                default:
                case 'OPTIONS':
                    const response = {
                        message: `Delete content ID ${content.id}?`,
                        editable: false,
                        content,
                        isBinary: false
                    };

                    if(this.isMimeTypeEditable(content.mimeType)) {
                        content.data = await contentTable.fetchContentData(content.id, 'UTF8');
                    } else {
                        response.isBinary = true;
                    }

                    if(req.session && req.session.userID) {
                        // const database = await req.server.selectDatabaseByRequest(req);
                        const userTable = new UserTable(req.database, req.server.dbClient);
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

    async renderContentList(req, res) {
        try {

            if (req.method === 'GET') {
                await ContentRenderer.send(req, res, {
                    title: `Site Index`,
                    data: `
    <content-form-browser></content-form-browser>
    <content-form-add></content-form-add>
    <content-form-upload></content-form-upload>
`
                });

            } else {
                return await this.renderContentListJSON(req, res);
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async renderContentListJSON(req, res) {
        try {

            // const database = await req.server.selectDatabaseByRequest(req);
            const contentTable = new ContentTable(req.database, req.server.dbClient);

            // Handle POST
            let whereSQL = '1', values = null;
            const search = req.body ? req.body.search : (req.query ? req.query.search : null);
            let paths = req.body ? req.body.paths : (req.query ? req.query.paths : null);
            if(search) {
                whereSQL = 'c.title LIKE ? OR c.data LIKE ? OR c.path LIKE ? OR c.id = ?';
                values = ['%'+search+'%', '%'+search+'%', '%'+search+'%', parseInt(search)];
            } else if(paths) {
                paths = paths.split(',').filter(path => path !== '/');
                whereSQL = paths.map(path => 'c.path LIKE ?').join(' OR ');
                values = paths.map(path => path + '%');
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

    async renderData(req, res, data, mimeType, lastModified) {
        res.setHeader('Last-Modified', lastModified.toUTCString());
        res.setHeader('Content-type', mimeType );
        res.send(data);
    }

    // TODO: render static data
    async renderStaticFile(req, res, next, filePath) {
        // const ext = path.extname(filePath);

        let stats = null;
        try {
            stats = await this.statFileAsync(filePath);
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
            const data = await this.readFileAsync(filePath);
            const mimeType = mime.lookup(filePath);
            await this.renderData(req, res, data, mimeType, stats.mtime);
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

    isMimeTypeEditable(mimeType) {
        return mimeType && [
            'image/x-icon',
            'text/html',
            'text/javascript',
            'application/json',
            'text/css',
            'image/svg+xml',
            // 'application/pdf',
            // 'application/msword',
            'application/xml'
        ].indexOf(mimeType.toLowerCase()) >= 0;
    }

    isMimeTypeRenderable(mimeType) {
        return mimeType && [
            'image/x-icon',
            'text/html',
            'text/javascript',
            'application/json',
            'text/css',
            'image/png',
            'image/jpeg',
            'audio/wav',
            'audio/mpeg',
            'image/svg+xml',
            'application/pdf',
            'application/msword',
            'application/xml'
        ].indexOf(mimeType.toLowerCase()) >= 0;
    }

    async renderError(error, req, res, json=null) {
        console.error(`${req.method} ${req.url}:`, error);
        res.status(400);
        if(error.redirect) {
            res.redirect(error.redirect);
        } else if(req.method === 'GET' && !json) {
            await ContentRenderer.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
        } else {
            res.json(Object.assign({}, {
                message: error.message,
                error: error.stack,
                code: error.code,
            }, json));
        }
    }


    /** File Utils **/
    readFileAsync (path, opts = null) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, opts, (err, data) => {
                err ? reject(err) : resolve(data);
            })
        })
    }

    statFileAsync (path) {
        return new Promise((resolve, reject) => {
            fs.stat(path, (err, data) => {
                err ? reject(err) : resolve(data);
            })
        })
    }

    unlinkFileAsync (path) {
        return new Promise((resolve, reject) => {
            fs.unlink(path, (err, data) => {
                err ? reject(err) : resolve(data);
            })
        })
    }

}


module.exports = ContentAPI;

