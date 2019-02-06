const { DatabaseManager } = require('../../database/database.manager');

// const { ConfigManager } = require('../config/config.manager');

class DomainDatabase  {
    constructor(dbName, debug=false) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = {
            domain: tablePrefix + '`domain`'
        };
    }

    async configure(config=null) {

        // Check for table
        await DatabaseManager.configureTable(this.table.domain,            DomainRow.getTableSQL(this.table.domain));

    }

    /** Domain Table **/

    async selectDomains(whereSQL, values, selectSQL='u.*,null as password') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table.domain} u
          WHERE ${whereSQL}
          `;

        const results = await DatabaseManager.queryAsync(SQL, values);
        return results.map(result => new DomainRow(result))
    }
    async fetchDomain(whereSQL, values, selectSQL='u.*,null as password') {
        const domains = await this.selectDomains(whereSQL, values, selectSQL);
        return domains[0];
    }

    async createDomain(name, email, password, flags='') {
        if(Array.isArray(flags))
            flags = flags.join(',');
        if(!name) throw new Error("Invalid name");
        if(!email) throw new Error("Invalid email");
        if(password) {
            const salt = await bcrypt.genSalt(10);
            password = await bcrypt.hash(password, salt);
        }
        let SQL = `
          INSERT INTO ${this.table.domain} SET ?`;
        await DatabaseManager.queryAsync(SQL, {
            name,
            email,
            password,
            flags
        });

        const domain = await this.fetchDomainByEmail(email);
        console.info("Domain Created", domain);
        return domain;
    }

    async updateDomain(domainID, email, password, profile, flags) {
        let set = {};
        if(email !== null) set.email = email;
        if(password !== null) set.password = password;
        if(profile !== null) set.profile = JSON.stringify(profile);
        if(flags !== null) set.flags = Array.isArray(flags) ? flags.join(',') : flags;
        let SQL = `UPDATE ${this.table.domain} SET ? WHERE id = ?`;

        return (await DatabaseManager.queryAsync(SQL, [set, domainID]))
            .affectedRows;
    }

}

class DomainRow {
    static getTableSQL(tableName) {
        return `
CREATE TABLE ${tableName} (
  \`name\` varchar(64) NOT NULL,
  \`database\` varchar(256) NOT NULL,
  UNIQUE KEY \`uk.domain.name\` (\`domain\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }


    constructor(row) {
        Object.assign(this, row);
    }
}


module.exports = {DomainRow, DomainDatabase};

