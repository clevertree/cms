const bodyParser = require('body-parser');
const path = require('path');
const ejs = require('ejs');
const express = require('express');

const BASE_DIR = path.resolve(path.dirname(__dirname));

// Init
class ViewManager {
    constructor(app) {
        this.app = app;
        app.express.use(bodyParser.urlencoded({ extended: true }));
        app.express.use(bodyParser.json());


        // set the view engine to ejs
        app.express.set('view engine', 'ejs');
        app.express.set('views',BASE_DIR);

        app.express.get(['/[\\w/]+\.ejs', '/'], function(req, res) {
            app.user.getSessionUser(req, (error, sessionUser) => {
                res.render(BASE_DIR + req.url, {
                    app, req, sessionUser
                });
            });
        });
        app.express.get(['/[\\w/]+', '/'], (req, res) => {
            this.renderArticle(req, res);
        });
        app.express.use(express.static(BASE_DIR));
    }

    renderArticle(req, res) {
        let SQL = `
          SELECT a.*
          FROM article a
          WHERE a.path = ?`;
        this.app.db.query(SQL, [req.url], (error, results, fields) => {
            res.send(ejs.render(results[0].content, {
                // TODO: direct rendering instead of using expres
            }));
        });
    }
    //
    //
    // registerArticlePaths() {
    //     let SQL = `
    //       SELECT a.path
    //       FROM article a`;
    //     this.app.db.query(SQL, [], (error, results, fields) => {
    //         for(var i=0; i<results.length) {
    //             this.registerArticlePath(results[i].path);
    //         }
    //     });
    // }
}

module.exports = {ViewManager};