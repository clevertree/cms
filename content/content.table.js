
// Init
class ContentTable {
    constructor(database, debug=false) {
        const tablePrefix = database ? `\`${database}\`.` : '';
        this.database = database;
        this.table = tablePrefix + '`content`';
        this.debug = debug;
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

    async updateContentWithRevision(title, data, path, user_id) {
        const existingContent = await this.fetchContentByPath(path);
        if(!existingContent) {
            // Initial revision shouldn't be created until first edit has been made
            return await this.insertContent(
                title,
                data,
                path,
                user_id,
            );
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
            existingContent.user_id,
        );
        await this.updateContent(
            existingContent.id,
            title,
            data,
            path,
            user_id
        );
        return existingContent.id;
    }

    async insertContent(title, data, path, user_id) {
        let set = {};
        if(title) set.title = title;
        if(data) set.data = data;
        if(path) set.path = path[0] === '/' ? path : '/' + path;
        if(user_id !== null) set.user_id = user_id;
        // if(parent_id !== null) set.parent_id = parent_id;
        // if(theme) set.theme = theme;
        // if(data !== null && typeof data === "object") set.data = JSON.stringify(data);
        let SQL = `
          INSERT INTO ${this.table}
          SET ?
        `;
        const results = await this.queryAsync(SQL, set);
        return results.insertId;
    }

    async updateContent(id, title, data, path, user_id) {
        let set = {};
        if(title) set.title = title;
        if(data) set.data = data;
        if(path) set.path = path;
        if(user_id !== null) set.user_id = user_id;
        // if(theme) set.theme = theme;
        // if(data !== null && typeof data === "object") set.data = JSON.stringify(data);
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

    /** Content Menu **/

    async queryMenuData(req) {
        let SQL = `
          SELECT c.id, c.path, c.title
          FROM ${this.table} c
          WHERE c.path IS NOT NULL
`;
        let menuEntries = await this.queryAsync(SQL);
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

    /** Table Schema **/

    getTableSQL() {
        return `
CREATE TABLE IF NOT EXISTS ${this.table} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`path\` varchar(96) NOT NULL,
  \`title\` varchar(96) NOT NULL,
  \`user_id\` int(11) DEFAULT NULL,
  \`data\` varbinary(65536) NOT NULL,
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

    get url() { return this.path || `/:content/${this.id}/`}
    // hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }
}

module.exports = {ContentTable, ContentRow};

