const { DatabaseManager } = require('../database/database.manager');

class ConfigDatabase  {
    constructor(database, debug=false) {
        const tablePrefix = database ? `\`${database}\`.` : '';
        this.database = database;
        this.table = {
            config: tablePrefix + '`config`'
        };
        this.debug = debug;
    }


    async configure(promptCallback=null) {
        // Configure tables
        await DatabaseManager.configureTable(this.table.config, ConfigRow.getTableSQL(this.table.config));
    }

    /** Config Table **/

    async selectAllConfigValues(withDefaults=true) {
        let defaultConfigList = [];

        const {ConfigManager} = require("./config.manager");
        if(withDefaults)
            defaultConfigList = ConfigManager.getConfigList();
        const configList = await this.selectConfigValues('1');
        const allConfigList = [];
        for(let i=0; i<defaultConfigList.length; i++) {
            let configEntry = configList.find(configEntry => configEntry.name === defaultConfigList[i].name);
            if(!configEntry) {
                configEntry = new ConfigRow({name: defaultConfigList[i].name});
            }
            allConfigList.push(configEntry);
            if(!configEntry.value && defaultConfigList[i].defaultValue)
                configEntry.value = typeof defaultConfigList[i].defaultValue === 'function' ? defaultConfigList[i].defaultValue() : defaultConfigList[i].defaultValue;
            configEntry.type = defaultConfigList[i].type;
        }
        return allConfigList;
    }

    async selectConfigValues(whereSQL, values) {
        let SQL = `
          SELECT c.*
          FROM ${this.table.config} c
          WHERE ${whereSQL}
          `;

        const results = await DatabaseManager.queryAsync(SQL, values);
        return results.map(result => new ConfigRow(result))
    }
    // async searchConfigs(search) {
    //     if(!isNaN(parseInt(search)) && isFinite(search)) {
    //         return await this.selectConfigValues('? IN (u.id)', search);
    //     } else {
    //         return await this.selectConfigValues('? IN (u.email, u.configname)', search);
    //     }
    // }

    // async fetchConfig(whereSQL, values) {
    //     const configs = await this.selectConfigValues(whereSQL, values);
    //     return configs[0];
    // }
    async fetchConfigValue(name) {
        const results = await this.selectConfigValues('c.name = ? LIMIT 1', name);
        return results.length > 0 ? results[0].value : null;
    }
    async fetchConfigValues(name) {
        const configList = await this.selectConfigValues('c.name LIKE ?', name+'%');
        const config = this.parseConfigValues(configList);
        if(typeof config[name] === "undefined")
            return {};
        return config[name];
    }

    async updateConfigValue(name, value, type=null) {
        let SQL = `REPLACE INTO ${this.table.config} SET ?;`;
        const result = await DatabaseManager.queryAsync(SQL, {name, value, type});
        return result.affectedRows;
    }

    parseConfigValues(configList) {
        const config = {};
        for(let i=0; i<configList.length; i++) {
            const path = configList[i].name.split('.');
            const lastPath = path.pop();
            let target = config;
            for(var j=0; j<path.length; j++) {
                if(typeof target[path[j]] === "undefined")
                    target[path[j]] = {};
                target = target[path[j]];
            }
            target[lastPath] = configList[i].value;
        }
        return config;
    }


    async promptValue(name, text, defaultValue, type=null) {
        const oldValue = await this.fetchConfigValue(name);
        if(oldValue)
            defaultValue = oldValue;
        const newValue = await this.prompt(text, defaultValue);
        await this.updateConfigValue(name, newValue, type);
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

// TODO: remove 'type' from database. It should be gotten elsewhare
class ConfigRow {
    static getTableSQL(tableName) {
        return `
CREATE TABLE ${tableName} (
  \`name\` varchar(64) NOT NULL,
  \`value\` TEXT DEFAULT NULL,
  \`type\` varchar(64) DEFAULT NULL,
  \`updated\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uk.config.name\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }
    
    constructor(row) {
        Object.assign(this, row);
        if(this.updated)
            this.updated = new Date(this.updated);
    }
}


module.exports = {ConfigRow, ConfigDatabase};

