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
        router.get(['/[\\w/]+(\.ejs)?', '/'], (req, res) => {
            this.renderArticle(req, res);
        });

        // Handle Article JSON / API
        router.get(['/\:article/:id(\\d+)', '/\:article/:id(\\d+)/json'], (req, res) => {
            this.getArticleJSON(req, res);
        });
        router.get(['/\:article/:id(\\d+)/edit', '/\:article/new'], (req, res) => {
            this.renderArticleEditor(req, res);
        });
    }

    renderArticle(req, res) {
        const app = this.app;
        const renderPath = req.url;
        app.article.fetchArticleByPath(renderPath, (error, article) => {
            if (error)
                return callback(error);
            if (!article)
                article = new Article({
                    content: 'Article not found: ' + renderPath,
                });
            article.theme = article.theme || app.config.theme;

            const theme = app.getTheme(article.theme);
            theme.renderArticle(article, req, res);
        });
    }

    renderArticleEditor(req, res) {
        const app = this.app;
        const articleID = parseInt(req.params.id);
        const editorArticle = new Article({
            content: `<%-include('editor/article-editor.ejs', {id: ${articleID}})%>`,
        });

        const theme = app.getTheme();
        theme.renderArticle(editorArticle, req, res);
    }

    getArticleJSON(req, res) {
        const app = this.app;
        const articleID = req.params.id;
        app.article.fetchArticleByID(articleID, (error, article) => {
            // res.set('Content-Type', 'application/json');
            res.json(article);
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


module.exports = {ArticleManager: ArticleManager};

