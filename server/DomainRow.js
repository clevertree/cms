
// const ConfigManager = require('../config/config.manager');

class DomainTable {
    constructor(dbName, dbClient) {
        this.dbName = dbName;
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = tablePrefix + '`domain`';
        this.dbClient = dbClient;
    }


    /** Configure Table **/
    async configure(hostname=null) {
        // Check for tables
        await this.dbClient.queryAsync(this.getTableSQL());
    }


    /** Domain Table **/

    async selectDomains(whereSQL, values, selectSQL='d.*') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table} d
          WHERE ${whereSQL}
          `;

        const results = await this.dbClient.queryAsync(SQL, values);
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
        const results = await this.dbClient.queryAsync(SQL, {hostname, database});
        return results.insertId;
    }

    async updateDomain(hostname, database) {
        // console.log(this, this.table);
        let SQL = `
          UPDATE ${this.table}
          SET \`database\` = ? where \`hostname\` = ?
          LIMIT 1;
        `;
        const results = await this.dbClient.queryAsync(SQL, [database, hostname]);
        return results.affectedRows;
    }

    getTableSQL() {
        return `
CREATE TABLE IF NOT EXISTS ${this.table} (
  \`hostname\` varchar(64) NOT NULL,
  \`database\` varchar(256) NULL,
  \`ssl\` TEXT DEFAULT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY \`uk.domain.name\` (\`hostname\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }


}


module.exports = DomainTable;

