const bcrypt = require('bcryptjs');
const uuidv4 = require('uuid/v4');


class UserMessageTable  {
    get UserAPI() { return require('./user.api').UserAPI; }

    constructor(dbName) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = tablePrefix + '`user_message`';
    }

    async configure(hostname=null) {
        // Check for tables
        await this.queryAsync(this.getTableSQL());
    }

    async configureInteractive() {
    }

    async queryAsync(SQL, values) {
        const DatabaseManager = require('../database/database.manager').DatabaseManager;
        return await DatabaseManager.queryAsync(SQL, values);
    }

    /** User Table **/

    async selectUserMessages(whereSQL, values, selectSQL='um.*') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table} um
          WHERE ${whereSQL}
          `;

        const results = await this.queryAsync(SQL, values);
        return results.map(result => new UserMessageRow(result))
    }

    async fetchUserMessage(whereSQL, values, selectSQL='um.*') {
        const messages = await this.selectUserMessages(whereSQL, values, selectSQL);
        return messages[0] || null;
    }
    async fetchUserMessageByID(messageID, selectSQL='um.*') {
        return await this.fetchUserMessage('? IN (um.id)', messageID, selectSQL);
    }

    async insertUserMessage(user_id, subject, body, parent_id, sender_user_id) {
        if(!user_id) throw new Error("Invalid User ID");
        if(!subject) throw new Error("Invalid subject");
        let SQL = `
          INSERT INTO ${this.table} SET ?`;
        const result = await this.queryAsync(SQL, {
            user_id, subject, body, parent_id, sender_user_id
        });
        if(!result.insertId)
            throw new Error("Message failed to insert");

        const message = await this.fetchUserMessageByID(result.insertId);
        console.info("Message Created", message);
        return message;
    }

    getTableSQL() {
        return `
CREATE TABLE IF NOT EXISTS ${this.table} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`user_id\` int(11) NOT NULL,
  \`parent_id\` int(11) DEFAULT NULL,
  \`sender_user_id\` int(11) DEFAULT NULL,
  \`subject\` TEXT NOT NULL,
  \`body\` TEXT NOT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx:user_message.parent_id\` (\`parent_id\` ASC),
  KEY \`idx:user_message.user_id\` (\`user_id\` ASC),
  KEY \`idx:user_message.sender_user_id\` (\`sender_user_id\` ASC),

  CONSTRAINT \`fk:user_message.parent_id\` FOREIGN KEY (\`parent_id\`) REFERENCES \`user_message\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk:user_message.sender_user_id\` FOREIGN KEY (\`sender_user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk:user_message.user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8;
`
    }


}

class UserMessageRow {
    constructor(row) {
        Object.assign(this, row);
    }

    get url() { return '/:user/:message/' + (this.id); }
}


module.exports = {UserMessageRow, UserMessageTable};

