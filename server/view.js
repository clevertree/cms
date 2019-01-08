const bodyParser = require('body-parser');
// const fs = require('fs');
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

        app.express.get(['/[\\w/]+(\.ejs)?', '/'], (req, res) => {
            const theme = app.getTheme(app.config.theme || 'minimal');
            theme.render(req, res);
            // this.render(req, res);
        });
        app.express.use(express.static(BASE_DIR));

        app.express.post('*', (req, res, next) => {
            const isJSONRequest = req.headers.accept.split(',').indexOf('application/json') !== -1;

            console.info("POST", req.url);
            res.sendAPIError = (message, redirect) => {
                console.error("API: ", message);
                if(isJSONRequest) {
                    res.status(status).json({success: false, message: message, redirect: redirect});
                    return;
                }
                const theme = app.getTheme(app.config.theme || 'minimal');
                theme.render(req, res);
            };
            res.sendAPISuccess = (message, redirect) => {
                if(isJSONRequest) {
                    res.json({success: true, message: message, redirect: redirect});
                    return;
                }
            };
            next();
        });
        // TODO: use view manager for post

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
        Object.assign(this, row);
        this.flag = this.flag ? this.flag.split(',') : [];
    }

    hasFlag(flag) { return this.flag.indexOf(flag) !== -1; }
}


module.exports = {ViewManager};

