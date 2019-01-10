// const fs = require('fs');
// const path = require('path');
// const ejs = require('ejs');
// const express = require('express');


// const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));
class Article {
    constructor(row) {
        this.id = row.id;
        this.parent_id = row.parent_id;
        this.path = row.path;
        this.title = row.title;
        this.theme = row.theme;
        this.flags = row.flags ? row.flags.split(',') : [];
        this.content = row.content;
    }

    hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }

}

// Init
class ArticleManager {
    constructor(app) {
        this.app = app;
    }

    get api() { return new ArticleAPI(this.app); }

    loadRoutes(router) {
        this.api.loadRoutes(router);
    }

    // TODO: load draft content
    queryArticles(whereSQL, values, callback) {
        let SQL = `
          SELECT a.*, 
          (SELECT ac.content FROM article_content ac WHERE a.id = ac.article_id AND ac.status = 'published' ORDER BY ac.created DESC LIMIT 1) as content
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

    insertArticleContent(article_id, user_id, status, content, callback) {
        let SQL = `
          INSERT INTO article_content
          SET ?
        `;
        this.app.db.query(SQL, {
            article_id,
            user_id,
            status,
            content,
        }, (error, results, fields) => {
            callback(error, results ? results.insertId : null)
        })
    }

    insertArticle(title, path, parent_id, theme, flags, callback) {
        let SQL = `
          INSERT INTO article
          SET ?
        `;
        this.app.db.query(SQL, {
            parent_id,
            path,
            title,
            theme,
            flags,
        }, (error, results, fields) => {
            if(error)
                return callback(error);
            callback(null, results);
        })
    }

    updateArticle(id, title, path, parent_id, theme, flags, callback) {
        let SQL = `
          UPDATE article a
          SET ?
          WHERE a.id = ?
        `;
        this.app.db.query(SQL, [{
            parent_id,
            path,
            title,
            theme,
            flags,
        }, id], (error, results, fields) => {
            if(error)
                return callback(error);
            callback(null, results);
        })
    }

    queryMenuData(callback) {
        let SQL = `
          SELECT a.id, a.parent_id, a.path, a.title, a.flags
          FROM article a
          WHERE (
                  FIND_IN_SET('main-menu', a.flags) 
              OR  FIND_IN_SET('sub-menu', a.flags)
          )
`;
        this.app.db.query(SQL, [], (error, menuEntries, fields) => {
            if(error)
                return callback(error);
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

                this.renderArticleResponse(article, article, req, res);
            });
        });
        router.get(['/:?article/:id/?', '/:?article/:id/:mode'], (req, res, next) => {
            this.app.article.fetchArticleByID(req.params.id, (error, article) => {
                if (error)
                    return res.status(400).send(error);
                if (!article)
                    return next();

                this.renderArticleResponse(article, article, req, res);
            });
        });
        router.post('/:?article/:id/:mode', (req, res, next) => {
            this.app.article.fetchArticleByID(req.params.id, (error, article) => {
                if (error)
                    return res.status(400).send(error);
                if (!article)
                    return next();

                this.handleArticleRequest(article, req, res);
            });
        });

    }


    handleArticleRequest(article, req, res) {
        const mode = req.params.mode || 'view';
        // API shouldn't render html
        switch(mode) {
            default:
                throw new Error("Unknown mode: " + mode);

            case 'view':
                return this.renderArticleResponse(article, article, req, res);
                // res.set('Content-Type', 'application/json');
                // res.json(article);
                // break;

            case 'edit':
                this.app.article.updateArticle(
                    req.body.id,
                    req.body.title,
                    req.body.path,
                    req.body.parent_id,
                    req.body.theme,
                    req.body.flags,
                    (error, articleUpdateResult) => {
                        if(error)
                            return this.renderArticleResponse(article, error, req, res);
                        if(req.body.content && req.body.content !== article.content) {
                            this.app.article.insertArticleContent(
                                req.body.id,
                                req.sessionUser ? req.sessionUser.id : null,
                                req.body.status,
                                req.body.content,
                                (error, insertArticleContentResult) => {
                                    if(error)
                                        return this.renderArticleResponse(article, error, req, res);
                                    return this.renderArticleResponse(article, {
                                        success: true,
                                        message: "Article and Content updated successfully",
                                        articleUpdateResult, insertArticleContentResult
                                    }, req, res);
                                });

                        } else {
                            return this.renderArticleResponse(article, {
                                success: true,
                                message: "Article updated successfully",
                                articleUpdateResult
                            }, req, res);
                        }
                    });
                break;
        }
    }

    renderArticleResponse(article, response, req, res) {

        const isJSONRequest = req.headers.accept.split(',').indexOf('application/json') !== -1;
        if(isJSONRequest) {
            res.set('Content-Type', 'application/json');
            res.json(response);
            return;
        }
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


module.exports = {ArticleManager: ArticleManager};

