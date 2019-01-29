const formidableMiddleware = require('express-formidable');
// const bodyParser = require('body-parser');
// const formidable = require('formidable');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');


const { FileDatabase } = require("./filedatabase.class");
const { UserSession } = require('../user/usersession.class');

class FileAPI {
    constructor() {
    }

    get fileDB () { return new FileDatabase(this.app.db); }

    get middleware() {
        const router = express.Router();
        router.post('/:?file/[:]upload', formidableMiddleware(), async (req, res) => await this.handleFileUpload(req, res));
        router.all('/:?file/[:]browse', formidableMiddleware(), async (req, res) => await this.handleFileBrowseRequest(req, res));
        router.get(/^\/?:file(.*)/, async (req, res, next) => await this.renderFileByPath(req, res, next));
        return (req, res, next) => {
            return router(req, res, next);
        }
    }

    async renderFileByPath(req, res, next) {
        try {
            const path = req.params[0];
            const fileEntry = await this.fileDB.fetchFileByPath(path);
            if(!fileEntry)
                return next();
            // res.writeHead(200, {'Content-Type': 'image/jpeg' });
            // res.end(fileEntry.content.toString('utf-8'));
            res.setHeader('Content-Description','File Transfer');
            // res.setHeader('Content-Disposition', 'attachment; filename=print.jpeg');
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', fileEntry.size);
            res.end(fileEntry.content);
            // res.end(fileEntry.content.toString('utf-8'));
            // console.log(err, fields, files);
            // res.json({msg: 'File ', error: err, images: ['/images/asdasdasd.png'], path});
        } catch (error) {
            console.log(error);
            res.status(400);
            res.json({message: error.message, error: error.stack});
            // res.send(
            //     await ThemeManager.get()
            //         .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
            // );
        }
    }


    async handleFileUpload(req, res) {
        try {
            const files = Object.values(req.files);
            if(files.length === 0)
                throw new Error("Invalid File(s)");
            const response = {
                message: 'No Action. ',
                files: [],
                errors: [],
                duplicates: 0,
                inserted: 0,
            };
            for(var i=0; i<files.length; i++) {
                const file = files[i];
                let path = '/uploads/' + file.name
                    .replace('.jpg.jpeg', '.jpeg')
                    .replace('.jpeg.jpeg', '.jpeg')
                    .replace('.gif.gif', '.gif')
                    .replace('.png.png', '.png');
                try {
                    const stats = await this.readFileStats(file.path);
                    const hash = await this.calculateFileHash(file.path);
                    const content = await this.readFileContent(file.path);
                    const sessionUser = await new UserSession(req.session).getSessionUser(this.app.db);
                    // const info = {
                    //     size: stats.size,
                    //     ctime: stats.ctime,
                    //     mtime: stats.mtime
                    // };

                    const duplicateFilePathEntry = await this.fileDB.fetchFileByPath(path);
                    const duplicateFileHashEntry = await this.fileDB.fetchFileByHash(hash);
                    if(duplicateFilePathEntry || duplicateFileHashEntry) {
                        if(duplicateFilePathEntry && !duplicateFileHashEntry)
                            throw new Error("This path already exists with a different hash. Please rename your file and try the upload again");

                        path = (duplicateFilePathEntry || duplicateFileHashEntry).path;
                        response.duplicates++;
                    } else {
                        await this.fileDB.insertFile(content, path, stats.size, hash, sessionUser.id);
                        response.inserted++;
                    }
                    response.files.push(`/:file${path}`);

                } catch (error) {
                    // if(error)
                    response.errors.push({message: error.message, error: error.stack, file: files[i].name});
                }
            }
            if(response.inserted > 0)
                response.message = `Inserted ${response.inserted} File${response.inserted > 1 ? 's' : ''}. `;
            if(response.duplicates > 0)
                response.message += `${response.duplicates} Duplicate file${response.duplicates > 1 ? 's' : ''} found`;

            if(response.errors.length > 0)
                res.status(400);
            res.json(response);

            // res.send(
            //     await ThemeManager.get(file.theme)
            //         .render(req, file.content, {file})
            // );
        } catch (error) {
            console.log(error);
            res.status(400);
            res.json({message: error.message, error: error.stack});
            // res.send(
            //     await ThemeManager.get()
            //         .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
            // );
        }
    }



    async handleFileBrowseRequest(req, res) {
        try {

            const files = await this.fileDB.selectFiles("1 ORDER BY f.created DESC");
            const response = {
                success: true,
                files: files,
                path: '/:file/',
                folders: ['/:file/']
            };


            res.json(response);

            // res.send(
            //     await ThemeManager.get(file.theme)
            //         .render(req, file.content, {file})
            // );
        } catch (error) {
            console.log(error);
            res.status(400);
            res.json({message: error.message, error: error.stack});
            // res.send(
            //     await ThemeManager.get()
            //         .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
            // );
        }
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

    // parseFileRequest(req) {
    //     return new Promise( ( resolve, reject ) => {
    //         var form = new formidable.IncomingForm();
    //         // form.keepExtensions = false; // Include the extensions of the original files.
    //         form.parse(req, function (err, fields, files) {
    //             err ? reject (err) : resolve ({files, fields});
    //         });
    //     });
    // }

}


module.exports = {FileAPI: new FileAPI()};

