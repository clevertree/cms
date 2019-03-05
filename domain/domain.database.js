const { DatabaseManager } = require('../database/database.manager');

// const { ConfigManager } = require('../config/config.manager');

class DomainDatabase  {
    constructor(dbName, debug=false) {
        if(!dbName)
            throw new Error("Database name is required");
        this.table = `\`${dbName}\`\.domain`;
    }

    async configure(promptCallback=null) {
        // Configure tables
        await DatabaseManager.configureTable(this.table,            this.getTableSQL());

    }

    /** Domain Table **/

    async selectDomains(whereSQL, values, selectSQL='d.*') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table} d
          WHERE ${whereSQL}
          `;

        const results = await DatabaseManager.queryAsync(SQL, values);
        return results.map(result => new DomainRow(result))
    }
    async fetchDomain(whereSQL, values, selectSQL='d.*') {
        const domains = await this.selectDomains(whereSQL, values, selectSQL);
        return domains[0] || null;
    }

    async fetchDomainByHostname(hostname, selectSQL='d.*') {
        return await this.fetchDomain("d.hostname = ?", hostname, selectSQL);
    }

    async insertDomain(hostname, database) {
        let SQL = `
          INSERT INTO ${this.table}
          SET ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, {hostname, database});
        return results.insertId;
    }

    async updateDomain(hostname, database) {
        // console.log(this, this.table);
        let SQL = `
          UPDATE ${this.table}
          SET \`database\` = ? where \`hostname\` = ?
          LIMIT 1;
        `;
        const results = await DatabaseManager.queryAsync(SQL, [database, hostname]);
        return results.affectedRows;
    }

    getTableSQL() {
        return `
CREATE TABLE ${this.table} (
  \`hostname\` varchar(64) NOT NULL,
  \`database\` varchar(256) NULL,
  \`ssl\` TEXT DEFAULT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY \`uk.domain.name\` (\`hostname\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }


}

class DomainRow {
    constructor(row) {
        Object.assign(this, row);
    }
}


module.exports = {DomainRow, DomainDatabase};

