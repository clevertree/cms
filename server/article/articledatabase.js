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

    async fetchArticlesByFlag(flags, selectSQL = 'id, parent_id, path, title, flags') {
        if(!Array.isArray(flags))
            flags = flags.split(',');
        const whereSQL = flags.map(flag => 'FIND_IN_SET(?, a.flags)').join(' OR ');
        return await this.selectArticles(selectSQL, whereSQL, flags);
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

    /** Article Menu **/

    async queryMenuData(cascade=true) {
        let SQL = `
          SELECT a.id, a.parent_id, a.path, a.title
          FROM article a
          WHERE a.path IS NOT NULL
`;
        const menuEntries = await this.queryAsync(SQL);
        if(!menuEntries || menuEntries.length === 0)
            throw new Error("No menu items found");
        if(!cascade)
            return menuEntries;

        const mainMenu = [];
        for(let i=0; i<menuEntries.length; i++) {
            const menuEntry = new ArticleEntry(menuEntries[i]);
            if(menuEntry.parent_id === null) {
                const subMenu = [];
                mainMenu.push([menuEntry, subMenu]);
                for(let j=0; j<menuEntries.length; j++) {
                    const menuEntry2 = new ArticleEntry(menuEntries[j]);
                    if(menuEntry.id === menuEntry2.parent_id) {
                        subMenu.push([menuEntry2, []]);
                    }
                }
            }
        }

        return mainMenu;
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

    // async fetchArticleRevisionByDate(articleID, revisionDate) {
    //     if(["string", "number"].indexOf(typeof revisionDate) !== -1)
    //         revisionDate = new Date(revisionDate);
    //     const revisions = await this.selectArticleRevision('*', 'ah.article_id = ? AND ah.created = ? LIMIT 1',
    //         [articleID, revisionDate]);
    //     return revisions[0];
    // }

    async fetchArticleRevisionByID(id, selectSQL = '*') {
        const revisions = await this.selectArticleRevision(selectSQL, `ah.id = ?`,
            [id]);
        return revisions[0];
    }

    async fetchArticleRevisionsByArticleID(articleID, limit=20, selectSQL = '*, NULL as content') {
        return await this.selectArticleRevision(selectSQL, `ah.article_id = ? ORDER BY ah.created DESC LIMIT ${limit}`,
            [articleID]);
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

