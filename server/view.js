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

    getArticleByPath(renderPath, callback) {
        let SQL = `
          SELECT a.*
          FROM article a
          WHERE a.path = ?`;
        this.app.db.query(SQL, [renderPath], (error, results, fields) => {
            callback(error, results && results[0] ? results[0] : null);
        });
    }

    getArticleByFlag(flags) { // Async with ejs?
        if(Array.isArray(flags))
            flags = flags.join(' ,')
        let SQL = `
          SELECT a.*
          FROM article a
          WHERE FIND_IN_SET(?, a.flag)`;
        this.app.db.query(SQL, [flags], (error, results, fields) => {
            callback(error, results);
        });
    }

    render(req, res) {
        const app = this.app;
        const renderPath = req.url;
        app.user.getSessionUser(req, (sessionUser) => {
            this.getArticleByPath(renderPath, (error, article) => {
                try {
                    if(error)
                        throw error;
                    if(!article)
                        throw "Path not found: " + renderPath;
                    const renderData = {
                        app, req, sessionUser
                    };
                    const renderedHTML = ejs.render(article.content, renderData, this.options);
                    renderData.content = renderedHTML;

                    const templatePath = path.resolve(BASE_DIR + '/theme/' + app.config.theme + '/template/default.ejs');
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