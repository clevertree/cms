const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const express = require('express');

const BASE_DIR = path.resolve(path.dirname(__dirname));

// Init
class ViewManager {
    constructor(app) {
        this.app = app;
        this.options = {
            views: [BASE_DIR]
        };
        app.express.use(bodyParser.urlencoded({ extended: true }));
        app.express.use(bodyParser.json());

        app.express.get(['/[\\w/]+(\.ejs)?', '/'], (req, res) => {
            this.render(req, res);
        });
        app.express.use(express.static(BASE_DIR));
    }

    render(req, res) {
        let SQL = `
          SELECT a.*
          FROM article a
          WHERE a.path = ?`;
        const app = this.app;
        const renderPath = req.url;
        app.user.getSessionUser(req, (sessionUser) => {
            this.app.db.query(SQL, [renderPath], (error, results, fields) => {
                try {
                    if(error)
                        throw error;
                    if(!results || results.length === 0)
                        throw "Path not found: " + renderPath;
                    const renderData = {
                        app, req, sessionUser
                    };
                    const renderedHTML = ejs.render(results[0].content, renderData, this.options);
                    renderData.content = renderedHTML;

                    const templatePath = path.resolve(BASE_DIR + '/theme/' + app.config.theme + '/template.ejs');
                    const templateHTML = fs.readFileSync(templatePath,{ encoding: 'utf8' });
                    const renderedTemplateHTML = ejs.render(templateHTML, renderData, this.options);
                    res.send(renderedTemplateHTML);
                } catch (e) {
                    console.error(e);
                    res.send(e);
                }
            });
        });
    }

}

module.exports = {ViewManager};