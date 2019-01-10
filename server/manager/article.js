// const fs = require('fs');
// const path = require('path');
// const ejs = require('ejs');
// const express = require('express');


// Init
class ArticleManager {
    constructor(app) {
        this.app = app;
    }

    get api() { return new ArticleAPI(this.app); }

    loadRoutes(router) {
        this.api.loadRoutes(router);
    }

    queryArticles(whereSQL, values, callback) {
        let SQL = `
          SELECT a.*
          FROM article a
          WHERE ${whereSQL}`;
        this.app.db.query(SQL, values, (error, results, fields) => {
            callback(error, results && results.length > 0
                ? results.map(result => new Article(result))
                : null);
        });
    }

    fetchArticleByPath(renderPath, callback) {
        this.queryArticles('a.path = ? LIMIT 1', renderPath, (error, results, fields) => {
            callback(error, results ? results[0] : null);
        });
    }
    fetchArticleByID(articleID, callback) {
        this.queryArticles('a.id = ? LIMIT 1', articleID, (error, results, fields) => {
            callback(error, results ? results[0] : null);
        });
    }

    updateArticle(data, callback) {
        let SQL = `
          UPDATE article
          SET ?
          WHERE id=?
        `;
        this.app.db.query(SQL, [{
                parent_id: data.parent_id || null,
                path: data.path,
                title: data.title,
                theme: data.theme,
                flag: data.flag,
                content: data.content,
            }, data.id],
            (error, results, fields) => {
            callback(error, results.affectedRows);
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

class ArticleAPI {
    constructor(app) {
        this.app = app;
    }


    loadRoutes(router) {
        // Handle Article requests
        router.get(['/[\\w/]+(?:\.ejs)?', '/'], (req, res, next) => {
            this.app.article.fetchArticleByPath(req.url, (error, article) => {
                if (error)
                    return res.status(400).send(error);
                if (!article)
                    return next();

                this.handleArticleRequest(article, req, res);
            });
        });
        router.get(['/:?article/:id/?', '/:?article/:id/:mode'], (req, res, next) => {
            this.handleArticleRequestByID(req, res, next);
        });
        router.post(['/:?article/:id/?', '/:?article/:id/:mode'], (req, res, next) => {
            this.handleArticleRequestByID(req, res, next);
        });

    }

    handleArticleRequestByID(req, res, next) {
        this.app.article.fetchArticleByID(req.params.id, (error, article) => {
            if (error)
                return res.status(400).send(error);
            if (!article)
                return next();

            this.handleArticleRequest(article, req, res);
        });
    }

    handleArticleRequest(article, req, res) {
        const mode = req.params.mode || 'view';
        const isJSONRequest = req.headers.accept.split(',').indexOf('application/json') !== -1;
        if(req.method === 'POST') {
            // API shouldn't render html
            switch(mode) {
                default:
                    throw new Error("Unknown mode: " + mode);

                case 'view':
                    res.set('Content-Type', 'application/json');
                    res.json(article);
                    break;

                case 'edit':
                    this.app.article.updateArticle(req.body, (error, updated) => {
                        res.set('Content-Type', 'application/json');
                        res.json({
                            success: true,
                            message: "Article updated successfully"
                        });
                    });
                    break;
            }

        } else {
            if(isJSONRequest) {
                res.set('Content-Type', 'application/json');
                res.json(article);

            } else {
                this.renderArticleResponse(article, req, res);
            }
        }
    }

    renderArticleResponse(article, req, res) {
        const mode = req.params.mode || 'view';

        switch(mode) {
            default:
                throw new Error("Unknown mode: " + mode);

            case 'view':
                break;

            case 'edit':
                const includeParams = JSON.stringify({
                    id: article.id,
                    // response: response
                });
                article = new Article({
                    content: `<%-include('editor/article-editor.ejs', ${includeParams})%>`,
                });
                break;
        }

        this.app.getTheme(article.theme)
            .renderArticle(article, req, res);
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


module.exports = {ArticleManager: ArticleManager};

