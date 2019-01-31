const bcrypt = require('bcryptjs');
const uuidv4 = require('uuid/v4');

class ConfigDatabase  {
    constructor(db, debug=false) {
        this.db = db;
        this.debug = debug;
    }

    async configureTable(tableName, tableSQL) {
        // Check for table
        try {
            await this.queryAsync(`SHOW COLUMNS FROM ${tableName}`);
        } catch (e) {
            if(e.code === 'ER_NO_SUCH_TABLE') {
                await this.queryAsync(tableSQL);
                await this.queryAsync(`SHOW COLUMNS FROM ${tableName}`);
                console.info(`Inserted table: ${tableName}`)
            } else {
                throw e;
            }
        }

    }

    async configure(prompt=false) {
        // Check for table
        await this.configureTable('config',            ConfigRow.SQL_TABLE);
    }

    /** Config Table **/

    async selectConfigs(whereSQL, values) {
        let SQL = `
          SELECT c.*
          FROM config c
          WHERE ${whereSQL}
          `;

        const results = await this.queryAsync(SQL, values);
        return results.map(result => new ConfigRow(result))
    }
    // async searchConfigs(search) {
    //     if(!isNaN(parseInt(search)) && isFinite(search)) {
    //         return await this.selectConfigs('? IN (u.id)', search);
    //     } else {
    //         return await this.selectConfigs('? IN (u.email, u.configname)', search);
    //     }
    // }

    // async fetchConfig(whereSQL, values) {
    //     const configs = await this.selectConfigs(whereSQL, values);
    //     return configs[0];
    // }
    async fetchConfigValue(name) {
        const results = await this.selectConfigs('c.name = ? LIMIT 1', name);
        return results.length > 0 ? results[0].value : null;
    }
    async getConfigValues(name) {
        const results = await this.selectConfigs('c.name LIKE ?', name+'%');
        const config = {};
        for(let i=0; i<results.length; i++) {
            const path = results[i].name.split('.');
            const lastPath = path.pop();
            let target = config;
            for(var j=0; j<path.length; j++) {
                if(typeof target[path[j]] === "undefined")
                    target[path[j]] = {};
                target = target[path[j]];
            }
            target[lastPath] = results[i].value;
        }
        return config[name];
    }

    async updateConfigValue(name, value) {
        let SQL = `REPLACE INTO config SET ?;`;
        const result = await this.queryAsync(SQL, {name, value});
        return result.affectedRows;
    }

    queryAsync(sql, values, cb) {
        if(cb)
            return this.db.query(sql, values, cb);
        return new Promise( ( resolve, reject ) => {
            this.db.query(sql, values, ( err, rows ) => {
                if(this.debug)
                    err ? console.error (err.message, sql, values || "No Values") : console.log (sql, values || "No Values");
                err ? reject (err) : resolve (rows);
            });
        });
    }

    async promptValue(name, text, defaultValue) {
        const oldValue = await this.fetchConfigValue(name);
        if(oldValue)
            defaultValue = oldValue;
        const newValue = await this.prompt(text, defaultValue);
        await this.updateConfigValue(name, newValue);
        return newValue;
    }

    async prompt(text, defaultValue=null) {
        var standard_input = process.stdin;
        standard_input.setEncoding('utf-8');
        return new Promise( ( resolve, reject ) => {
            process.stdout.write(text + ` [${(defaultValue === null ? 'null' : defaultValue)}]: `);
            standard_input.on('data', function (data) {
                data = data.trim() || defaultValue;
                resolve (data);
            });
        });
    }
    // var readline = require('readline');
    //
    // var rl = readline.createInterface({
    //     input: process.stdin,
    //     output: process.stdout
    // });
    //
    // rl.stdoutMuted = true;
    //
    // rl.query = "Password : ";
    // rl.question(rl.query, function(password) {
    //     console.log('\nPassword is ' + password);
    //     rl.close();
    // });
    //
    // rl._writeToOutput = function _writeToOutput(stringToWrite) {
    //     if (rl.stdoutMuted)
    //         rl.output.write("\x1B[2K\x1B[200D"+rl.query+"["+((rl.line.length%2==1)?"=-":"-=")+"]");
    //     else
    //         rl.output.write(stringToWrite);
    // };
}

class ConfigRow {
    static get SQL_TABLE() {
        return `
CREATE TABLE \`config\` (
  \`name\` varchar(256) NOT NULL,
  \`value\` TEXT NOT NULL,
  \`updated\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uk.config.name\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }
    
    constructor(row) {
        this.name = row.name;
        this.value = row.value;
    }
}


module.exports = {ConfigRow, ConfigDatabase};
