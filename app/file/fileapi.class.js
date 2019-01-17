const formidableMiddleware = require('express-formidable');
// const bodyParser = require('body-parser');
// const formidable = require('formidable');
const fs = require('fs');

const { FileDatabase } = require("./filedatabase.class");
const { UserSession } = require('../user/usersession.class');

class FileapiClass {
    constructor(app) {
        this.app = app;
    }

    get fileDB () { return new FileDatabase(this.app.db); }

    loadRoutes(router) {
        router.get(/^\/?:file(.*)/, async (req, res) => await this.renderFileByPath(req, res));
        router.post('/:?file/[:]upload', formidableMiddleware(), async (req, res) => await this.handleFileUpload(req, res));
        router.all('/:?file/[:]browse', formidableMiddleware(), async (req, res) => await this.handleFileBrowseRequest(req, res));
    }

    async renderFileByPath(req, res, next) {
        try {
            const path = req.params[0];
            const fileEntry = await this.fileDB.fetchFileByPath(path);
            // res.writeHead(200, {'Content-Type': 'image/jpeg' });
            // res.end(fileEntry.content.toString('utf-8'));
            res.setHeader('Content-Description','File Transfer');
            // res.setHeader('Content-Disposition', 'attachment; filename=print.jpeg');
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', fileEntry.info.size);
            res.end(fileEntry.content);
            // res.end(fileEntry.content.toString('utf-8'));
            // console.log(err, fields, files);
            // res.json({msg: 'File ', error: err, images: ['/images/asdasdasd.png'], path});
        } catch (error) {
            console.log(error);
            res.status(400);
            res.json({message: error.message, error: error.stack});
            // res.send(
            //     await this.app.getTheme()
            //         .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
            // );
        }
    }


    async handleFileUpload(req, res) {
        try {
            const file = Object.values(req.files)[0];
            if(!file)
                throw new Error("Invalid File");
            const path = '/uploads/' + file.name
                .replace('.jpg.jpeg', '.jpeg')
                .replace('.jpeg.jpeg', '.jpeg')
                .replace('.gif.gif', '.gif')
                .replace('.png.png', '.png');
            const stats = await this.readFileStats(file.path);
            const content = await this.readFileContent(file.path);
            const sessionUser = await new UserSession(req.session).getSessionUser(this.app.db);
            const info = {
                size: stats.size,
                ctime: stats.ctime,
                mtime: stats.mtime
            };

            const result = await this.fileDB.insertFile(content, path, sessionUser.id, info);
            res.json({
                msg: 'File was uploaded successfully',
                files: [`/:file${path}`],
                baseurl: req.headers.origin,
                result
            });

            // res.send(
            //     await this.app.getTheme(file.theme)
            //         .render(req, file.content, {file})
            // );
        } catch (error) {
            console.log(error);
            res.status(400);
            res.json({message: error.message, error: error.stack});
            // res.send(
            //     await this.app.getTheme()
            //         .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
            // );
        }
    }



    async handleFileBrowseRequest(req, res) {
        try {
            const response = {
                success: true,
                data: {
                    // messages?: string[];
                    sources: {
                        'local': {
                            path: ':file/',
                            baseurl: req.headers.origin,
                            files: [
                                {
                                    file: 'file',
                                    // thumb: string;
                                    // thumbIsAbsolute?: boolean;
                                    // changed: string;
                                    // size: string;
                                    // isImage: boolean;
                                }
                            ]
                        }
                    }
                    // code: number;
                    // path: string;
                    // name: string;
                    // source: string;
                    // permissions?: IPermissions | null;
                }
            };


            res.json(response);

            // res.send(
            //     await this.app.getTheme(file.theme)
            //         .render(req, file.content, {file})
            // );
        } catch (error) {
            console.log(error);
            res.status(400);
            res.json({message: error.message, error: error.stack});
            // res.send(
            //     await this.app.getTheme()
            //         .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
            // );
        }
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


module.exports = {FileAPI: FileapiClass};

