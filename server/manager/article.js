// const fs = require('fs');
// const path = require('path');
// const ejs = require('ejs');
// const express = require('express');


// const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));
class ArticleEntry {
    constructor(row) {
        this.id = row.id;
        this.parent_id = row.parent_id;
        this.path = row.path;
        this.title = row.title;
        this.theme = row.theme;
        this.flags = row.flags ? row.flags.split(',') : [];
        this.content = row.content;
        this.created = row.created;
        this.updated = row.updated;
    }

    hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }
}

class ArticleHistoryEntry {
    constructor(row) {
        this.article_id = row.article_id;
        this.user_id = row.user_id;
        this.title = row.title;
        this.content = row.content;
        this.created = row.created;
    }
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

    /** Articles **/

    async selectArticles(selectSQL, whereSQL, values) {
        let SQL = `
          SELECT ${selectSQL}
          FROM article a
          WHERE ${whereSQL}`;

        const results = await this.app.db.queryAsync(SQL, values);
        if(!results)
            return null;
        return results.map(result => new ArticleEntry(result));
    }

    async fetchArticleByPath(renderPath) {
        return await this.selectArticles('*', 'a.path = ? LIMIT 1', renderPath)[0];
    }
    async fetchArticleByID(renderPath) {
        return await this.selectArticles('*', 'a.id = ? LIMIT 1', renderPath)[0];
    }

    insertArticle(title, content, path, user_id, parent_id, theme, flags, callback) {
        let SQL = `
          INSERT INTO article
          SET ?
        `;
        this.app.db.query(SQL,
            {title, content, path, user_id, parent_id, theme, flags},
            (error, results, fields) => {
                if(error)
                    return callback(error);
                callback(null, results.insertId, results);
            })
    }

    updateArticle(id, title, content, path, user_id, parent_id, theme, flags, callback) {
        let SQL = `
          UPDATE article a
          SET ?
          WHERE a.id = ?
        `;
        this.app.db.query(SQL, [{title, content, path, user_id, parent_id, theme, flags}, id],
            (error, results, fields) => {
                if(error)
                    return callback(error);
                callback(null, results.affectedRows, results);
            })
    }

    /** Article History **/

    selectArticleHistory(selectSQL, whereSQL, values, callback) {
        let SQL = `
          SELECT ${selectSQL}
          FROM article_history ah
          WHERE ${whereSQL}
          ORDER BY created DESC`;

        this.app.db.query(SQL, values, (error, results) => {
            callback(error, results && results.length > 0
                ? results.map(result => new ArticleHistoryEntry(result))
                : null);
        });
    }

    // Inserting history without updating article === draft
    insertArticleHistory(article_id, title, content, user_id, callback) {
        let SQL = `
          INSERT INTO article_history
          SET ?
        `;
        this.app.db.query(SQL,
            {article_id, user_id, title, content},
            (error, results, fields) => {
                if(error)
                    return callback(error);
                callback(null, results.insertId, results);
            })
    }

    /** Article Menu **/

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
                const menuEntry = new ArticleEntry(menuEntries[i]);
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

            this.app.article.fetchArticleByPath(req.params.id)
                .then((article) => {
                    this.renderArticleResponse(article, article, req, res);
                }).catch((error) => {
                    res.status(400).send(error)
                });
        });


        router.all('/:?article/:id/view', (req, res, next) => this.handleView(req, res, next));
        router.all('/:?article/:id/edit', (req, res, next) => this.handleEdit(req, res, next));
    }

    async handleView(req, res, next) {
        const article = await this.app.article.fetchArticleByID(req.params.id);

        if(req.method === 'GET') {
            return this.renderArticleResponse(article, article, req, res);
        }
        return this.renderArticleResponse(article, article, req, res);
    }

    async handleEdit(req, res, next) {
        let insertID;
        const article = await this.app.article.fetchArticleByID(req.params.id);

        if(req.method === 'GET') {
            return this.renderArticleResponse(article, article, req, res);
        }
        switch(req.body.action) {
            default:
            case 'publish':
                const affectedRows = await this.app.article.updateArticle(
                    article.id,
                    req.body.title,
                    req.body.content,
                    req.body.path,
                    req.sessionUser ? req.sessionUser.id : null,
                    req.body.parent_id ? parseInt(req.body.parent_id) : null,
                    req.body.theme,
                    req.body.flags);

                insertID = await this.app.article.insertArticleHistory(
                    article.id,
                    req.body.title,
                    req.body.content,
                    req.sessionUser ? req.sessionUser.id : null);
                return this.renderArticleResponse(article, {
                    success: !error,
                    message: error || "Article published successfully",
                    insertID
                }, req, res);

            case 'draft':
                insertID = await this.app.article.insertArticleHistory(
                    article.id,
                    req.body.title,
                    req.body.content,
                    req.sessionUser ? req.sessionUser.id : null);
                return this.renderArticleResponse(article, {
                    success: !error,
                    message: error || "Draft saved successfully",
                    insertID
                }, req, res);
                break;
        }
    }


    renderArticleResponse(article, response, req, res) {
        const mode = req.params.mode || 'view';
        const isJSONRequest = req.headers.accept.split(',').indexOf('application/json') !== -1;

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
                article = new ArticleEntry({
                    content: `<%-include('editor/article-editor.ejs', ${includeParams})%>`,
                });
                break;
        }

        if(isJSONRequest) {
            res.set('Content-Type', 'application/json');
            res.json(response);

        } else {
            this.app.getTheme(article.theme)
                .renderArticle(article, req, res);
        }
    }


}


module.exports = {ArticleManager, ArticleEntry, ArticleAPI};

