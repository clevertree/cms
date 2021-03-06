const UserMessageRow = require('./UserMessageRow');

const SQL_SELECT = 'um.*, u.email as "to", su.email as "from", u.username as "to_username", su.username as "from_username"';
const SQL_SELECT_LIST = SQL_SELECT + ', NULL as body';
const SQL_ORDER = 'um.id DESC';
class UserMessageTable  {

    constructor(dbName, dbClient) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = tablePrefix + '`user_message`';
        this.tableUser = tablePrefix + '`user`';
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


    /** User Table **/

    async selectUserMessages(whereSQL, values, selectSQL=SQL_SELECT) {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table} um
          LEFT JOIN ${this.tableUser} u on u.id = um.user_id
          LEFT JOIN ${this.tableUser} su on su.id = um.sender_user_id
          WHERE ${whereSQL}
          `;

        const results = await this.dbClient.queryAsync(SQL, values);
        return results.map(result => new UserMessageRow(result))
    }

    async selectUserMessageByUserID(userID, groupBy=null, orderBy=SQL_ORDER, limit=25, selectSQL=SQL_SELECT_LIST) {
        let whereSQL = "um.user_id = ?";
        if(groupBy)
            whereSQL += " GROUP BY " + groupBy;
        if(orderBy)
            whereSQL += " GROUP BY " + orderBy;
        whereSQL += " LIMIT " + limit;
        return await this.selectUserMessages(whereSQL, userID, selectSQL);
    }

    async fetchUserMessage(whereSQL, values, selectSQL=SQL_SELECT) {
        const messages = await this.selectUserMessages(whereSQL, values, selectSQL);
        return messages[0] || null;
    }
    async fetchUserMessageByID(messageID, selectSQL=SQL_SELECT) {
        return await this.fetchUserMessage('? IN (um.id)', messageID, selectSQL);
    }

    async insertUserMessage(user_id, subject, body, sender_user_id) {
        if(!user_id) throw new Error("Invalid User ID");
        if(!subject) subject = ""; // throw new Error("Invalid subject");
        let SQL = `
          INSERT INTO ${this.table} SET ?`;
        const result = await this.dbClient.queryAsync(SQL, {
            user_id, subject, body, sender_user_id
        });
        if(!result.insertId)
            throw new Error("Message failed to insert");

        const message = await this.fetchUserMessageByID(result.insertId);
        // console.info("Message Created", message);
        return message;
    }

    getTableSQL() {
        return `
CREATE TABLE IF NOT EXISTS ${this.table} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`user_id\` int(11) NOT NULL,
  \`sender_user_id\` int(11) DEFAULT NULL,
  \`subject\` TEXT NOT NULL,
  \`body\` TEXT NOT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx:userMessage.user_id\` (\`user_id\` ASC),
  KEY \`idx:userMessage.sender_user_id\` (\`sender_user_id\` ASC),

  CONSTRAINT \`fk:userMessage.sender_user_id\` FOREIGN KEY (\`sender_user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk:userMessage.user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8;
`
    }


}


module.exports = UserMessageTable;

