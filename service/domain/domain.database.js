const { DatabaseManager } = require('../../database/database.manager');

// const { ConfigManager } = require('../config/config.manager');

class DomainDatabase  {
    constructor(dbName, debug=false) {
        if(!dbName)
            throw new Error("Database name is required");
        this.table = {
            domain: `\`${dbName}\`\.domain`
        };
    }

    async configure() {
        // Configure tables
        await DatabaseManager.configureTable(this.table.domain,            DomainRow.getTableSQL(this.table.domain));

    }

    /** Domain Table **/

    async selectDomains(whereSQL, values, selectSQL='d.*') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table.domain} d
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
          INSERT INTO ${this.table.domain}
          SET ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, {hostname, database});
        return results.insertId;
    }
}

class DomainRow {
    static getTableSQL(tableName) {
        return `
CREATE TABLE ${tableName} (
  \`hostname\` varchar(64) NOT NULL,
  \`database\` varchar(256) NOT NULL,
  \`ssl\` TEXT DEFAULT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY \`uk.domain.name\` (\`hostname\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }


    constructor(row) {
        Object.assign(this, row);
    }
}


module.exports = {DomainRow, DomainDatabase};

