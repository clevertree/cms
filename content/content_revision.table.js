const { DatabaseManager } = require('../database/database.manager');

// Init
class ContentRevisionTable {
    constructor(dbName, debug=false) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = tablePrefix + '`content_revision`';
        this.debug = debug;
    }

    /** Configure Table **/
    async configure(promptCallback=null, hostname=null) {
        // Check for tables
        await this.queryAsync(this.getTableSQL());
    }

    /** SQL Query Method **/
    async queryAsync(SQL, values) {
        const DatabaseManager = require('../database/database.manager').DatabaseManager;
        return await DatabaseManager.queryAsync(SQL, values);
    }

    /** Content Revision **/
    async selectContentRevision(whereSQL, values, selectSQL = '*, NULL as data') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table} cr
          WHERE ${whereSQL}
          `;

        const results = await this.queryAsync(SQL, values);
        return results.map(result => new ContentRevisionRow(result))
    }

    // async fetchContentRevisionByDate(contentID, revisionDate) {
    //     if(["string", "number"].indexOf(typeof revisionDate) !== -1)
    //         revisionDate = new Date(revisionDate);
    //     const revisions = await this.selectContentRevision('*', 'cr.content_id = ? AND cr.created = ? LIMIT 1',
    //         [contentID, revisionDate]);
    //     return revisions[0];
    // }

    async fetchContentRevisionByID(id, selectSQL = '*, NULL as data') {
        const revisions = await this.selectContentRevision(`cr.id = ?`,
            [id], selectSQL);
        return revisions[0];
    }
    async fetchContentRevisionByDate(created, selectSQL = '*, NULL as data') {
        const revisions = await this.selectContentRevision(`cr.created = ?`,
            [created], selectSQL);
        return revisions[0];
    }

    async fetchContentRevisionsByContentID(contentID, limit=20, selectSQL = '*, NULL as data') {
        return await this.selectContentRevision(`cr.content_id = ? ORDER BY cr.id DESC LIMIT ${limit}`,
            [contentID], selectSQL);
    }

    async fetchRevisionData(contentID, asString=null) {
        const content = await this.fetchContentRevisionByID(contentID, 'cr.data');
        if(!content)
            throw new Error("Content ID not found: " + contentID);
        if(asString)
            return content.data.toString(asString);
        return content.data;
    }
    // Inserting revision without updating content === draft
    async insertContentRevision(content_id, data, user_id) {
        let SQL = `
          INSERT INTO ${this.table}
          SET ?
        `;
        const results = await this.queryAsync(SQL, {content_id, user_id, data});
        return results.insertId;
    }

    /** Table Schema **/

    getTableSQL() {
        return `
CREATE TABLE IF NOT EXISTS ${this.table} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`content_id\` int(11) NOT NULL,
  \`user_id\` int(11) NOT NULL,
  \`data\` varbinary(65536) DEFAULT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx:content_revision.content_id\` (\`content_id\` ASC),
  KEY \`idx:content_revision.user_id\` (\`user_id\` ASC),

  CONSTRAINT \`fk:content_revision.content_id\` FOREIGN KEY (\`content_id\`) REFERENCES \`content\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk:content_revision.user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }

}


class ContentRevisionRow {

    constructor(row) {
        Object.assign(this, row);
    }

}

module.exports = {ContentRevisionTable, ContentRevisionRow};

