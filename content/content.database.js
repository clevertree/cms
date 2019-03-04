const { DatabaseManager } = require('../database/database.manager');

// Init
class ContentDatabase {
    constructor(dbName, debug=false) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = {
            content:            tablePrefix + '`content`',
            content_revision:   tablePrefix + '`content_revision`',
        };
        this.debug = debug;
    }

    async configure(promptCallback=null, hostname=null) {
        // Check for tables
        await DatabaseManager.configureTable(this.table.content,             ContentRow.getTableSQL(this.table.content));
        await DatabaseManager.configureTable(this.table.content_revision,    ContentRevisionRow.getTableSQL(this.table.content_revision));

        // Insert home page
        let homeContent = await this.fetchContentByPath("/");
        if(homeContent) {
            console.info("Home Content Found: " + homeContent.id);
        } else {
            hostname = hostname || require('os').hostname();
            let homeContentTitle = 'Home';
            let homeContentContent = `
            <section>
                <h1 class="themed" id="activities">${hostname}</h1>
                <p>
                    Welcome to ${hostname}!
                </p>
            </section>
`;
            const homeContentID = await this.insertContent(homeContentTitle, homeContentContent, "/");
            console.info("Home Content Created: " + homeContentID);
        }
    }

    /** Content **/

    async selectContent(whereSQL, values, selectSQL='c.*, NULL as data') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table.content} c
          WHERE ${whereSQL}`;

        const results = await DatabaseManager.queryAsync(SQL, values);
        return results ? results.map(result => new ContentRow(result)) : null;
    }
    async fetchContent(whereSQL, values, selectSQL='c.*, NULL as data') {
        const content = await this.selectContent(whereSQL, values, selectSQL);
        return content[0] || null;
    }

    async fetchContentByPath(renderPath) {
        renderPath = renderPath.split('?')[0];
        return await this.fetchContent('c.path = ? LIMIT 1', renderPath, 'c.*'); }
    async fetchContentByID(contentID) { return await this.fetchContent('c.id = ? LIMIT 1', contentID, 'c.*'); }

    async getData(path) {
        const content = await this.fetchContentByPath(path);
        if(!content)
            throw new Error("Content path not found: " + path);
        return content.data;
    }
    // async fetchContentByFlag(flags, selectSQL = 'id, parent_id, path, title, flags') {
    //     if(!Array.isArray(flags))
    //         flags = flags.split(',');
    //     const whereSQL = flags.map(flag => 'FIND_IN_SET(?, c.flags)').join(' OR ');
    //     return await this.selectContent(whereSQL, flags, selectSQL);
    // }

    async insertContent(title, data, path, user_id, theme) {
        let set = {};
        if(title) set.title = title;
        if(data) set.data = data;
        if(path) set.path = path[0] === '/' ? path : '/' + path;
        if(user_id !== null) set.user_id = user_id;
        // if(parent_id !== null) set.parent_id = parent_id;
        if(theme) set.theme = theme;
        // if(data !== null && typeof data === "object") set.data = JSON.stringify(data);
        let SQL = `
          INSERT INTO ${this.table.content}
          SET ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, set);
        return results.insertId;
    }

    async updateContent(id, title, data, path, user_id, theme) {
        let set = {};
        if(title) set.title = title;
        if(data) set.data = data;
        if(path) set.path = path;
        if(user_id !== null) set.user_id = user_id;
        if(theme) set.theme = theme;
        // if(data !== null && typeof data === "object") set.data = JSON.stringify(data);
        let SQL = `
          UPDATE ${this.table.content} c
          SET ?, updated = UTC_TIMESTAMP()
          WHERE c.id = ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, [set, id]);
        return results.affectedRows;
    }

    async deleteContent(id) {
        let SQL = `
          DELETE FROM ${this.table.content}
          WHERE id = ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, [id]);
        return results.affectedRows;
    }

    /** Content Menu **/

    async queryMenuData(req) {
        let SQL = `
          SELECT c.id, c.path, c.title
          FROM ${this.table.content} c
          WHERE c.path IS NOT NULL
`;
        let menuEntries = await DatabaseManager.queryAsync(SQL);
        // if(!menuEntries || menuEntries.length === 0)
        //     throw new Error("No menu items found");

        const mainMenu = [];
        // menuEntries = menuEntries.map(menuEntry => Object.assign({}, menuEntry));

        for(let i=0; i<menuEntries.length; i++) {
            let menuEntry = menuEntries[i];
            // if(menuEntry.parent_id === null) { // parent_id === null indicates top level menu
                mainMenu.push(menuEntry);
                continue;
            // }
            // for(let j=0; j<menuEntries.length; j++) {
            //     let menuEntry2 = menuEntries[j];
            //     if(menuEntry.id === menuEntry2.parent_id) {
            //         if(typeof menuEntry.subMenu === "undefined")
            //             menuEntry.subMenu = [];
            //         menuEntry.subMenu.push(menuEntry2);
            //     }
            // }
        }

        return mainMenu;
    }

    /** Content Revision **/

    async selectContentRevision(whereSQL, values, selectSQL='cr.*') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table.content_revision} cr
          WHERE ${whereSQL}
          `;

        const results = await DatabaseManager.queryAsync(SQL, values);
        return results.map(result => new ContentRevisionRow(result))
    }

    // async fetchContentRevisionByDate(contentID, revisionDate) {
    //     if(["string", "number"].indexOf(typeof revisionDate) !== -1)
    //         revisionDate = new Date(revisionDate);
    //     const revisions = await this.selectContentRevision('*', 'cr.content_id = ? AND cr.created = ? LIMIT 1',
    //         [contentID, revisionDate]);
    //     return revisions[0];
    // }

    async fetchContentRevisionByID(id, selectSQL = '*') {
        const revisions = await this.selectContentRevision(`cr.id = ?`,
            [id], selectSQL);
        return revisions[0];
    }
    async fetchContentRevisionByDate(created, selectSQL = '*') {
        const revisions = await this.selectContentRevision(`cr.created = ?`,
            [created], selectSQL);
        return revisions[0];
    }

    async fetchContentRevisionsByContentID(contentID, limit=20, selectSQL = '*, NULL as data') {
        return await this.selectContentRevision(`cr.content_id = ? ORDER BY cr.id DESC LIMIT ${limit}`,
            [contentID], selectSQL);
    }

    // Inserting revision without updating content === draft
    async insertContentRevision(content_id, title, data, user_id) {
        let SQL = `
          INSERT INTO ${this.table.content_revision}
          SET ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, {content_id, user_id, title, data});
        return results.insertId;
    }

}

class ContentRow {
    static getTableSQL(tableName) {
        return `
CREATE TABLE ${tableName} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`path\` varchar(96) NOT NULL,
  \`title\` varchar(96) NOT NULL,
  \`data\` text DEFAULT NULL,
  \`theme\` varchar(64) DEFAULT NULL,
  \`created\` datetime DEFAULT current_timestamp(),
  \`updated\` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk:content.path\` (\`path\`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8;
`
    }

    constructor(row) {
        Object.assign(this, row);
    }

    get url() { return this.path || `/:content/${this.id}/`}
    // hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }
}

class ContentRevisionRow {
    static getTableSQL(tableName) {
        return `
CREATE TABLE ${tableName} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`content_id\` int(11) NOT NULL,
  \`title\` varchar(96) DEFAULT NULL,
  \`data\` TEXT,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx:content_revision.content_id\` (\`content_id\` ASC),
  KEY \`idx:content_revision.user_id\` (\`user_id\` ASC),

  CONSTRAINT \`fk:content_revision.content_id\` FOREIGN KEY (\`content_id\`) REFERENCES \`content\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }

    constructor(row) {
        Object.assign(this, row);
    }

}

module.exports = {ContentDatabase, ContentRow, ContentRevisionRow};

