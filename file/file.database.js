// const fs = require('fs');
// const path = require('path');
// const ejs = require('ejs');
// const express = require('express');

// TODO server files via content table
const { DatabaseManager } = require('../database/database.manager');

// Init
class FileDatabase {
    constructor(dbName, debug=false) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = {
            file: tablePrefix + '`file`'
        };
        this.debug = debug;
    }

    async configure(interactive=false) {
        // Check for tables
        // await DatabaseManager.configureTable(this.table.file, ArticleRow.getTableSQL(this.table.article));
    }
    /** Files **/

    async selectFiles(whereSQL, values, selectSQL='f.*, null as content') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table.file} f
          WHERE ${whereSQL}`;

        const results = await DatabaseManager.queryAsync(SQL, values);
        return results ? results.map(result => new FileEntry(result)) : null;
    }

    async fetchFileByPath(renderPath) {
        const files = await this.selectFiles('f.path = ? LIMIT 1', renderPath, 'f.*');
        return files[0];
    }
    async fetchFileByHash(hash) {
        const files = await this.selectFiles('f.hash = ? LIMIT 1', hash, 'f.*');
        return files[0];
    }
    async fetchFileByID(renderPath) {
        const files = await this.selectFiles('f.id = ? LIMIT 1', renderPath, 'f.*');
        return files[0];
    }

    async insertFile(content, path, size, hash=null, user_id=null) {
        let SQL = `
          INSERT INTO ${this.table.file}
          SET ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, {content, path, user_id, size, hash});
        return results.insertId;
    }

    async updateFile(id, path, user_id, info) {
        let set = {};
        if(path !== null) set.path = path;
        if(user_id !== null) set.user_id = user_id;
        if(content !== null) set.content = content;
        if(info !== null) set.info = JSON.stringify(info);
        let SQL = `
          UPDATE ${this.table.file} a
          SET ?
          WHERE f.id = ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, [set, id]);
        return results.affectedRows;
    }

}

class FileEntry {
    constructor(row) {
        this.id = row.id;
        this.user_id = row.user_id;
        this.path = row.path;
        this.content = row.content;
        // this.info = row.info ? JSON.parse(row.info) : null;
        // if(this.info.ctime) this.info.ctime = new Date(this.info.ctime);
        // if(this.info.mtime) this.info.mtime = new Date(this.info.mtime);
        this.hash = row.hash;
        this.size = row.size;
        this.created = row.created;
        this.updated = row.updated;
    }
}

module.exports = {FileDatabase, FileEntry};

