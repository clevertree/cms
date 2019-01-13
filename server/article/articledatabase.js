// const fs = require('fs');
// const path = require('path');
// const ejs = require('ejs');
// const express = require('express');
// const {UserSession} = require('./user.js');

// Init
class ArticleDatabase {
    constructor(db) {
        this.db = db;
    }
    
    /** Articles **/

    async selectArticles(selectSQL, whereSQL, values) {
        let SQL = `
          SELECT ${selectSQL}
          FROM article a
          WHERE ${whereSQL}`;

        const results = await this.queryAsync(SQL, values);
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
        return await this.queryAsync(SQL, {title, content, path, user_id, parent_id, theme, flags})
            .insertId;
    }

    async updateArticle(id, title, content, path, user_id, parent_id, theme, flags, callback) {
        let SQL = `
          UPDATE article a
          SET ?
          WHERE a.id = ?
        `;
        const results = await this.queryAsync(SQL, [{title, content, path, user_id, parent_id, theme, flags}, id]);
        return results.affectedRows;
    }

    /** Article History **/

    async selectArticleHistory(selectSQL, whereSQL, values, callback) {
        let SQL = `
          SELECT ${selectSQL}
          FROM article_history ah
          WHERE ${whereSQL}
          ORDER BY created DESC`;

        return await this.queryAsync(SQL, values)
            .map(result => new ArticleHistoryEntry(result))
    }

    // Inserting history without updating article === draft
    async insertArticleHistory(article_id, title, content, user_id, callback) {
        let SQL = `
          INSERT INTO article_history
          SET ?
        `;
        const results = await this.queryAsync(SQL, {article_id, user_id, title, content})
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
        const menuEntries = await this.queryAsync(SQL);
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


    queryAsync(sql, values) {
        return new Promise( ( resolve, reject ) => {
            this.db.query(sql, values, ( err, rows ) => {
                err ? reject (err) : resolve (rows);
            });
        });
    }
}

class ArticleEntry {
    constructor(row) {
        this.id = row.id;
        this.parent_id = row.parent_id;
        this.user_id = row.user_id;
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

module.exports = {ArticleDatabase, ArticleEntry, ArticleHistoryEntry};

