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
        const articles = await this.selectArticles('*', 'a.path = ? LIMIT 1', renderPath);
        return articles[0];
    }
    async fetchArticleByID(renderPath) {
        const articles = await this.selectArticles('*', 'a.id = ? LIMIT 1', renderPath);
        return articles[0];
    }

    async insertArticle(title, content, path, user_id, parent_id, theme, flags, callback) {
        let SQL = `
          INSERT INTO article
          SET ?
        `;
        return await this.app.db.queryAsync(SQL, {title, content, path, user_id, parent_id, theme, flags})
            .insertId;
    }

    async updateArticle(id, title, content, path, user_id, parent_id, theme, flags, callback) {
        let SQL = `
          UPDATE article a
          SET ?
          WHERE a.id = ?
        `;
        const results = await this.app.db.queryAsync(SQL, [{title, content, path, user_id, parent_id, theme, flags}, id])
        return results.affectedRows;
    }

    /** Article History **/

    async selectArticleHistory(selectSQL, whereSQL, values, callback) {
        let SQL = `
          SELECT ${selectSQL}
          FROM article_history ah
          WHERE ${whereSQL}
          ORDER BY created DESC`;

        return await this.app.db.queryAsync(SQL, values)
            .map(result => new ArticleHistoryEntry(result))
    }

    // Inserting history without updating article === draft
    async insertArticleHistory(article_id, title, content, user_id, callback) {
        let SQL = `
          INSERT INTO article_history
          SET ?
        `;
        const results = await this.app.db.queryAsync(SQL, {article_id, user_id, title, content})
        return results.insertId;
    }

    /** Article Menu **/

    async queryMenuData() {
        let SQL = `
          SELECT a.id, a.parent_id, a.path, a.title, a.flags
          FROM article a
          WHERE (
                  FIND_IN_SET('main-menu', a.flags) 
              OR  FIND_IN_SET('sub-menu', a.flags)
          )
`;
        const menuEntries = await this.app.db.queryAsync(SQL);
        if(!menuEntries || menuEntries.length === 0)
            throw new Error("No menu items found");
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

        return Object.values(menuData);
    }

}
class ArticleAPI {
    constructor(app) {
        this.app = app;
    }


    loadRoutes(router) {
        // Handle Article requests
        router.get(['/[\\w/]+(?:\.ejs)?', '/'], async (req, res, next) => await this.handleViewByPath(req, res,next));


        router.all(['/:?article/:id/view', '/:?article/:id'], async (req, res, next) => await this.handleViewByID(req, res, next));
        router.all('/:?article/:id/edit', async (req, res, next) => await this.handleEditByID(req, res, next));
    }

    async handleViewByPath(req, res, next) {
        try {
            const article = await this.app.article.fetchArticleByPath(req.url);
            if(!article)
                return next();
            await this.renderArticle(article, article, req, res);
        } catch (error) {
            res.status(400).send(error)
        }
    }

    async handleViewByID(req, res, next) {
        try {
            const article = await this.app.article.fetchArticleByID(req.params.id);
            if(!article)
                return next();
            await this.renderArticle(article, article, req, res);
        } catch (error) {
            res.status(400).send(error)
        }
    }

    async handleEditByID(req, res, next) {
        try {
            let insertID;
            const article = await this.app.article.fetchArticleByID(req.params.id);
            if(!article)
                return next();

            if(req.method === 'GET') {
                // TODO: fetch revision history
                return await this.renderArticleEditor(article, article, req, res);
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
                    return this.renderArticle(article, {
                        success: true,
                        message: "Article published successfully",
                        insertID
                    }, req, res);

                case 'draft':
                    insertID = await this.app.article.insertArticleHistory(
                        article.id,
                        req.body.title,
                        req.body.content,
                        req.sessionUser ? req.sessionUser.id : null);
                    return this.renderArticle(article, {
                        success: true,
                        message: "Draft saved successfully",
                        insertID
                    }, req, res);
                    break;
            }
        } catch (error) {
            res.status(400).send(error.message || error)
        }
    }


    async renderArticle(article, response, req, res) {
        const isJSONRequest = req.headers.accept.split(',').indexOf('application/json') !== -1;

        if(isJSONRequest) {
            res.set('Content-Type', 'application/json');
            res.json(response);

        } else {
            if(req.method !== 'GET')
                return res.redirect('/:article/' + article.id + '/view')

            res.send(
                await this.app.getTheme(article.theme)
                    .render(req, article.content, {article})
            );
        }
    }


    async renderArticleEditor(article, response, req, res) {
        const isJSONRequest = req.headers.accept.split(',').indexOf('application/json') !== -1;

        if(isJSONRequest) {
            res.set('Content-Type', 'application/json');
            res.json(response);

        } else {
            if(req.method !== 'GET')
                return res.redirect('/:article/' + article.id + '/edit')

            res.send(
                await this.app.getTheme(article.theme)
                    .render(req, `
                        <script src="/client/form/article-form/article-form.client.js"></script>
                        <article-form article-id="${article.id}"></article-form>
                    `, {article})
            );
        }
    }


}


module.exports = {ArticleManager, ArticleEntry, ArticleAPI};

