const ContentRevisionRow = require('./ContentRevisionRow');

// TODO: user_id isn't available during insert
class ContentRevisionTable {
    constructor(dbName, dbClient) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = tablePrefix + '`content_revision`';
        this.dbClient = dbClient;
    }

    /** Initiate Table **/
    async init() {
        // Check for tables
        await this.dbClient.queryAsync(this.getTableSQL());
    }

    /** Interactive Configuration **/
    async configure(hostname, interactive=false) {

    }

    /** Content Revision **/
    async selectContentRevision(whereSQL, values, selectSQL = '*, NULL as data') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table} cr
          WHERE ${whereSQL}
          `;

        const results = await this.dbClient.queryAsync(SQL, values);
        return results.map(result => new ContentRevisionRow(result))
    }

    // async fetchContentRevisionByDate(contentID, revisionDate) {
    //     if(["string", "number"].indexOf(typeof revisionDate) !== -1)
    //         revisionDate = new Date(revisionDate);
    //     const revisions = await this.selectContentRevision('*', 'cr.content_id = ? AND cr.created = ? LIMIT 1',
    //         [contentID, revisionDate]);
    //     return revisions[0];
    // }

    async fetchContentRevisionByID(id, selectSQL = '*, NULL as data, LENGTH(data) as "length"') {
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

    async fetchRevisionData(contentRevisionID, asString=null) {
        const content = await this.fetchContentRevisionByID(contentRevisionID, 'cr.data');
        if(!content)
            throw new Error("Content Revision ID not found: " + contentRevisionID);
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
        const results = await this.dbClient.queryAsync(SQL, {content_id, user_id, data});
        return results.insertId;
    }

    /** Table Schema **/

    getTableSQL() {
        return `
CREATE TABLE IF NOT EXISTS ${this.table} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`content_id\` int(11) NOT NULL,
  \`user_id\` int(11) DEFAULT NULL,
  \`data\` BLOB DEFAULT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx:contentRevision.content_id\` (\`content_id\` ASC),
  KEY \`idx:contentRevision.user_id\` (\`user_id\` ASC),

  CONSTRAINT \`fk:contentRevision.content_id\` FOREIGN KEY (\`content_id\`) REFERENCES \`content\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk:contentRevision.user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }

}

module.exports = ContentRevisionTable;

