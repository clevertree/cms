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
        return results ? results.map(result => new ArticleEntry(result)) : null;
    }

    async fetchArticleByPath(renderPath) {
        const articles = await this.selectArticles('*', 'a.path = ? LIMIT 1', renderPath);
        return articles[0];
    }
    async fetchArticleByID(renderPath) {
        const articles = await this.selectArticles('*', 'a.id = ? LIMIT 1', renderPath);
        return articles[0];
    }

    async insertArticle(title, content, path, user_id, parent_id, theme, flags) {
        let SQL = `
          INSERT INTO article
          SET ?
        `;
        return await this.queryAsync(SQL, {title, content, path, user_id, parent_id, theme, flags})
            .insertId;
    }

    async updateArticle(id, title, content, path, user_id, parent_id, theme, flags) {
        let SQL = `
          UPDATE article a
          SET ?
          WHERE a.id = ?
        `;
        const results = await this.queryAsync(SQL, [{title, content, path, user_id, parent_id, theme, flags}, id]);
        return results.affectedRows;
    }

    /** Article Revision **/

    async selectArticleRevision(selectSQL, whereSQL, values) {
        let SQL = `
          SELECT ${selectSQL}
          FROM article_revision ah
          WHERE ${whereSQL}
          `;

        const results = await this.queryAsync(SQL, values);
        return results.map(result => new ArticleRevisionEntry(result))
    }

    async fetchArticleRevisionByDate(articleID, revisionDate) {
        const revisions = await this.selectArticleRevision('*', 'ah.article_id = ? AND ah.created = ? LIMIT 1',
            [articleID, revisionDate]);
        return revisions[0];
    }

    async fetchArticleRevisionsByArticle(articleID, limit=20) {
        const revisions = await this.selectArticleRevision('*, NULL as content', `ah.article_id = ? ORDER BY ah.created DESC LIMIT ${limit}`,
            [articleID]);
        return revisions;
    }

    // Inserting revision without updating article === draft
    async insertArticleRevision(article_id, title, content, user_id, callback) {
        let SQL = `
          INSERT INTO article_revision
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

class ArticleRevisionEntry {
    constructor(row) {
        this.id = row.id;
        this.article_id = row.article_id;
        this.user_id = row.user_id;
        this.title = row.title;
        if(row.content !== null)
            this.content = row.content;
        this.created = row.created;
    }
}

module.exports = {ArticleDatabase, ArticleEntry, ArticleRevisionEntry};

