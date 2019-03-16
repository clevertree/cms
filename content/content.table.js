const path = require('path');
const fs = require('fs');

// Init
class ContentTable {
    constructor(database) {
        const tablePrefix = database ? `\`${database}\`.` : '';
        this.database = database;
        this.table = tablePrefix + '`content`';
    }

    /** SQL Query Method **/
    async queryAsync(SQL, values) {
        const DatabaseManager = require('../database/database.manager').DatabaseManager;
        return await DatabaseManager.queryAsync(SQL, values);
    }

    /** Configure Table **/
    async configure(promptCallback=null, hostname=null) {
        // Check for tables
        await this.queryAsync(this.getTableSQL());

        hostname = hostname || require('os').hostname();

        await this.insertDefaultContent("/site/template.html",  "Site Template",    __dirname + '/client/default/site/template.html', hostname);
        await this.insertDefaultContent("/site/template.js",    "Site Javascript",  __dirname + '/client/default/site/template.js');
        await this.insertDefaultContent("/site/template.css",   "Site CSS",         __dirname + '/client/default/site/template.css');
        await this.insertDefaultContent("/site/logo.png",       "Site Logo",        __dirname + '/client/default/site/logo.png');
        await this.insertDefaultContent("/config/profile.json", "Profile Config",   __dirname + '/client/default/config/profile.json');
        await this.insertDefaultContent("/",                    "Home",             __dirname + '/client/default/home.html', hostname);
        await this.insertDefaultContent("/about",               "About Us",         __dirname + '/client/default/about.html', hostname);
        await this.insertDefaultContent("/contact",             "Contact Us",       __dirname + '/client/default/contact.html', hostname);

    }

    async insertDefaultContent(renderPath, contentTitle, filePath, replaceHostname=false) {
        if(await this.fetchContentByPath(renderPath))
            return;
        let contentHTML = await this.readFileAsync(path.resolve(filePath), replaceHostname ? 'UTF8' : null);
        if(replaceHostname) {
            contentHTML = contentHTML.replace(/<%-hostname%>/g, replaceHostname);
        }
        const insertID = await this.insertContent(renderPath, contentTitle, contentHTML);
        console.info(`${contentTitle} Created: `, insertID);
        return insertID;
    }

    /** Content **/

    async selectContent(whereSQL, values, selectSQL='c.*, NULL as data') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table} c
          WHERE ${whereSQL}`;

        const results = await this.queryAsync(SQL, values);
        return results ? results.map(result => new ContentRow(result)) : null;
    }
    async fetchContent(whereSQL, values, selectSQL='c.*, NULL as data') {
        const content = await this.selectContent(whereSQL, values, selectSQL);
        return content[0] || null;
    }

    async fetchContentByPath(renderPath, selectSQL='c.*, NULL as data') {
        renderPath = renderPath.split('?')[0];
        return await this.fetchContent('c.path = ? LIMIT 1', renderPath, selectSQL);
    }
    async fetchContentByID(contentID, selectSQL='c.*, NULL as data') {
        return await this.fetchContent('c.id = ? LIMIT 1', contentID, selectSQL);
    }

    async fetchContentData(contentID, asString=null) {
        const content = await this.fetchContentByID(contentID, 'c.data');
        if(!content) return null; // throw new Error("Content ID not found: " + contentID);
        return asString ? content.data.toString(asString) : content.data;
    }
    async fetchContentDataByPath(contentPath, asString=null) {
        const content = await this.fetchContentByPath(contentPath, 'c.data');
        if(!content) return null; // throw new Error("Content ID not found: " + contentID);
        return asString ? content.data.toString(asString) : content.data;
    }


    // async fetchContentByFlag(flags, selectSQL = 'id, parent_id, path, title, flags') {
    //     if(!Array.isArray(flags))
    //         flags = flags.split(',');
    //     const whereSQL = flags.map(flag => 'FIND_IN_SET(?, c.flags)').join(' OR ');
    //     return await this.selectContent(whereSQL, flags, selectSQL);
    // }

    async insertOrUpdateContentWithRevision(path, title, data, user_id = null) {
        const existingContent = await this.fetchContentByPath(path);
        if(!existingContent) {
            // Initial revision shouldn't be created until first edit has been made
            return await this.insertContent(path, title, data, user_id);
        }

        const oldData = await this.fetchContentData(existingContent.id);
        if(oldData && data.toString() === oldData.toString()) {
            console.warn(`Old data matched new data. No updates or revisions made to ${existingContent.path}`);
            return existingContent.id;
        }

        // Content is being updated, so store old data as a revision.
        const { ContentRevisionTable } = require('./content_revision.table');
        const contentRevisionTable = new ContentRevisionTable(this.database);
        await contentRevisionTable.insertContentRevision(
            existingContent.id,
            existingContent.data,
            existingContent.user_id || -1
        );
        await this.updateContent(existingContent.id, path, title, data, user_id);
        return existingContent.id;
    }

    async insertContent(path, title, data, user_id = null) {
        let set = {};
        if(title) set.title = title;
        if(data) set.data = data;
        if(path) set.path = path[0] === '/' ? path : '/' + path;
        if(user_id) set.user_id = user_id;

        let SQL = `
          INSERT INTO ${this.table}
          SET ?
        `;
        const results = await this.queryAsync(SQL, set);
        return results.insertId;
    }

    async updateContent(id, path, title, data, user_id = null) {
        let set = {};
        if(title) set.title = title;
        if(data) set.data = data;
        if(path) set.path = path;
        if(user_id) set.user_id = user_id;

        let SQL = `
          UPDATE ${this.table} c
          SET ?, updated = UTC_TIMESTAMP()
          WHERE c.id = ?
        `;
        const results = await this.queryAsync(SQL, [set, id]);
        return results.affectedRows;
    }

    async deleteContent(id) {
        let SQL = `
          DELETE FROM ${this.table}
          WHERE id = ?
        `;
        const results = await this.queryAsync(SQL, [id]);
        return results.affectedRows;
    }


    /** File Utilities **/
    readFileAsync (path, opts = 'utf8') {
        return new Promise((resolve, reject) => {
            fs.readFile(path, opts, (err, data) => {
                err ? reject(err) : resolve(data);
            })
        })
    }

    
    /** Table Schema **/

    getTableSQL() {
        return `
CREATE TABLE IF NOT EXISTS ${this.table} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`path\` varchar(96) NOT NULL,
  \`title\` varchar(96) NOT NULL,
  \`user_id\` int(11) DEFAULT NULL,
  \`data\` varbinary(MAX) NOT NULL,
  \`created\` datetime DEFAULT current_timestamp(),
  \`updated\` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  KEY \`idx:content.user_id\` (\`user_id\` ASC),
  UNIQUE KEY \`uk:content.path\` (\`path\`),
  CONSTRAINT \`fk:content.user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8;
`
    }

}

class ContentRow {

    constructor(row) {
        Object.assign(this, row);
    }


    get mimeType() {
        const ext = path.extname(this.path);
        if(!ext)
            return null;
        const mime = require('mime');
        return mime.lookup(ext);
    }


    get url() { return this.path || `/:content/${this.id}/`}
    // hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }
}

module.exports = {ContentTable, ContentRow};
