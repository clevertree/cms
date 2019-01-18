// const fs = require('fs');
// const path = require('path');
// const ejs = require('ejs');
// const express = require('express');
// const {UserSession} = require('./user.js');

// Init
class FileDatabase {
    constructor(db) {
        this.db = db;
    }
    
    /** Files **/

    async selectFiles(whereSQL, values, selectSQL='f.*, null as content') {
        let SQL = `
          SELECT ${selectSQL}
          FROM file f
          WHERE ${whereSQL}`;

        const results = await this.queryAsync(SQL, values);
        return results ? results.map(result => new FileEntry(result)) : null;
    }

    async fetchFileByPath(renderPath) {
        const files = await this.selectFiles('f.path = ? LIMIT 1', renderPath, 'f.*');
        return files[0];
    }
    async fetchFileByID(renderPath) {
        const files = await this.selectFiles('f.id = ? LIMIT 1', renderPath, 'f.*');
        return files[0];
    }

    async insertFile(content, path, size, hash=null, user_id=null) {
        let SQL = `
          INSERT INTO file
          SET ?
        `;
        const results = await this.queryAsync(SQL, {content, path, user_id, size, hash});
        return results.insertId;
    }

    async updateFile(id, path, user_id, info) {
        let set = {};
        if(path !== null) set.path = path;
        if(user_id !== null) set.user_id = user_id;
        if(content !== null) set.content = content;
        if(info !== null) set.info = JSON.stringify(info);
        let SQL = `
          UPDATE file a
          SET ?
          WHERE f.id = ?
        `;
        const results = await this.queryAsync(SQL, [set, id]);
        return results.affectedRows;
    }

    queryAsync(sql, values) {
        return new Promise( ( resolve, reject ) => {
            this.db.query(sql, values, ( err, rows ) => {
                err ? reject (err) : resolve (rows);
            });
        });
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

