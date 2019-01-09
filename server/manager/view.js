const bodyParser = require('body-parser');
// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const express = require('express');

const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));

// Init
class ViewManager {
    constructor(app) {
        this.app = app;
    }

    loadRoutes(router) {
        const app = this.app;
        // API Routes
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());

        router.get(['/[\\w/]+(\.ejs)?', '/'], (req, res) => {
            this.handleArticleRequest(req, res);
        });
        router.use(express.static(BASE_DIR));

        router.post('*', (req, res, next) => {
            const isJSONRequest = req.headers.accept.split(',').indexOf('application/json') !== -1;

            console.info("POST", req.url);
            res.sendAPIError = (message, redirect=null) => {
                res.sendAPIResponse(message, redirect, 404);
            };
            res.sendAPIResponse = (message, redirect=null, status=200) => {
                console[status === 200 ? 'info' : 'error']("API: ", message);
                if(status)
                    res.status(status);
                if(isJSONRequest) {
                    res.json({success: status === 200, message: message, redirect: redirect});
                    return;
                }
                let redirectHTML = '';
                if(redirect)
                    redirectHTML = `<script>setTimeout(()=>document.location.href = '${redirect}', 3000);</script>`;

                const theme = app.getTheme(app.config.theme || 'minimal');
                theme.renderArticle({
                    title: message,
                    content: `
                        <section>
                            <h4>${message}</h4>
                            ${redirectHTML}
                        </section>
                        `,
                    // redirect: redirect
                }, req, res);
            };
            next();
        });
    }

    handleArticleRequest(req, res) {
        const app = this.app;
        const renderPath = req.url;
        app.view.getArticleByPath(renderPath, (error, article) => {
            if(error)
                return callback(error);
            if(!article)
                article = new Article({
                    content: 'Article not found: ' + renderPath,
                });
            article.theme = article.theme || app.config.theme || 'minimal';

            const theme = app.getTheme(article.theme || app.config.theme || 'minimal');
            theme.renderArticle(article, req, res);
        });
    }

    renderArticleWithTheme(articleContent, theme) {

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


    queryMenuData(callback) {
        let SQL = `
          SELECT a.id, a.parent_id, a.path, a.title, a.flag
          FROM article a
          WHERE (
                  FIND_IN_SET('main-menu', a.flag) 
              OR  FIND_IN_SET('sub-menu', a.flag)
          )
`;
        this.app.db.query(SQL, [], (error, menuEntries, fields) => {
            if(!menuEntries || menuEntries.length === 0)
                return callback("No menu items found");
            const menuData = {};
            for(let i=0; i<menuEntries.length; i++) {
                const menuEntry = new Article(menuEntries[i]);
                if(menuEntry.hasFlag('main-menu')) {
                    if(!menuData[menuEntry.id]) menuData[menuEntry.id] = [null, []];
                    menuData[menuEntry.id][0] = menuEntry;
                }
                if(menuEntry.hasFlag('sub-menu')) {
                    if(!menuData[menuEntry.parent_id]) menuData[menuEntry.parent_id] = [null, []];
                    menuData[menuEntry.parent_id][1].push(menuEntry);
                }
            }

            callback(null, Object.values(menuData));
        });
    }

}

// const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));
class Article {
    constructor(row) {
        this.id = row.id;
        this.parent_id = row.parent_id;
        this.path = row.path;
        this.title = row.title;
        this.theme = row.theme;
        this.flag = row.flag ? row.flag.split(',') : [];
        this.content = row.content;
    }

    hasFlag(flag) { return this.flag.indexOf(flag) !== -1; }

}


module.exports = {ViewManager};

