
const mysql = require('mysql');

const { LocalConfig } = require('../config/local.config');
const { TaskManager } = require('../service/task/task.manager');
// const { FileManager } = require('../service/file/file.manager');
// const { UserAPI } = require('../user/user.api');

// const { ArticleDatabase } = require('../article/article.database');
// const { UserDatabase } = require('../user/user.database');
// const { ConfigDatabase } = require('../config/config.database');

// const BASE_DIR = path.resolve(path.dirname(__dirname));

class DatabaseManager {
    constructor() {
        this.config = null;
        this.db = null;
        this.cacheHostname = {};
    }

    async getArticleDB(database=null)    { return new (require('../article/article.database').ArticleDatabase)(database); }
    async getUserDB(database=null)       { return new (require('../user/user.database').UserDatabase)(database); }
    async getConfigDB(database=null)     { return new (require('../config/config.database').ConfigDatabase)(database); }
    async getDomainDB(database=null)     { return new (require('../service/domain/domain.database').DomainDatabase)(database); }


    async configure(config=null, forcePrompt=0) {
        const localConfig = new LocalConfig(config, !config);
        const dbConfig = await localConfig.getOrCreate('database');
        const serverConfig = await localConfig.getOrCreate('server');
        let defaultHostname     = serverConfig.hostname || (require('os').hostname()).toLowerCase();
        let defaultDatabaseName = defaultHostname.replace('.', '_') + '_cms';

        if(forcePrompt || !dbConfig.database || !dbConfig.user || !dbConfig.host || typeof dbConfig.multiDomain === 'undefined') {
            await localConfig.promptValue('database.host', `Please enter the Database Host`, dbConfig.host || 'localhost');
            defaultDatabaseName = defaultHostname.replace('.', '_') + '_cms';
            await localConfig.promptValue('database.user', `Please enter the Database User Name`, dbConfig.user || 'root');
            await localConfig.promptValue('database.password', `Please enter the Password for Database User '${dbConfig.user}'`, null, 'password');
            await localConfig.promptValue('database.database', `Please enter the Database Name`, dbConfig.database || defaultDatabaseName);
            await localConfig.promptValue('database.multiDomain', `Enable Multi-domain hosting? [y or n]`, dbConfig.multiDomain || 'n');
            // dbConfig.multiDomain = dbConfig.multiDomain && dbConfig.multiDomain === 'y';
            // localConfig.saveAll();
        }
        try {
            // dbConfig.insecureAuth = true;
            const db = await this.createConnection(dbConfig);
            db.end();
        } catch (e) {
            if(e.code === "ER_BAD_DB_ERROR") {
                console.info("Database not found: ", e.message);
                const repairConfig = Object.assign({}, dbConfig);
                delete repairConfig.database;
                const repairDB = await this.createConnection(repairConfig);
                await queryAsync(repairDB, `CREATE SCHEMA \`${dbConfig.database}\``);
                await queryAsync(repairDB, `USE \`${dbConfig.database}\``);
                console.info(`Created new schema: \`${dbConfig.database}\``);
                repairDB.end();
                const db = await this.createConnection(dbConfig);
                db.end();
            } else {
                if(forcePrompt < 3) {
                    console.error(e.message);
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Sleep 3 seconds
                    return await this.configure(config, forcePrompt + 1);
                }
                throw e;
            }
        }

        this.config = dbConfig;
        // dbConfig.debug = true;

        // Configure Databases
        await this.configureDatabase(dbConfig.database, defaultHostname, true);

        return dbConfig;
    }

    async configureDatabase(database, hostname, interactive=false) {
        const databaseExists = await this.queryAsync(`SHOW DATABASES LIKE '${database}'`);
        if(databaseExists.length === 0) {
            console.info("Database not found: ", database);
            await this.queryAsync(`CREATE SCHEMA \`${database}\``);
            await this.queryAsync(`USE \`${database}\``);
            console.info(`Created new schema: \`${database}\``);
        }

        const tables = [
            await this.getUserDB(database),
            await this.getArticleDB(database),
            await this.getConfigDB(database),
        ];
        if(database === this.config.database)
            tables.push( await this.getDomainDB(database));
        for(let i=0; i<tables.length; i++)
            await tables[i].configure(interactive);

        // Configure Domain
        const domainDB = await this.getDomainDB(null);
        domainDB.configure(interactive);
        const domain = await domainDB.fetchDomainByHostname(hostname);
        if(!domain) {
            await domainDB.insertDomain(hostname, database);
            console.info(`Created domain entry: ${hostname} => ${database}`);
        }

        // Set up admin user
        await require('../user/user.api').UserAPI.configureAdmin(database, hostname, interactive);

        // Set up default config
        const configDB = await this.getConfigDB(database);
        let userProfile = await configDB.fetchConfigValue('user.profile');
        if (!userProfile)
            await configDB.updateConfigValue('user.profile', JSON.stringify([
                {name: 'name', title: "Full Name"},
                {name: 'description', type: "textarea", title: "Description"},
            ]));


        // Init Tasks
        await TaskManager.configure(database);

    }

    async get(reconnect=false) {
        // let host = req ? req.headers.host.split(':')[0] : null;
        // if(!host)
        //     host = require('os').hostname();
        // host = host.toLowerCase();

        if(this.db) {
            if(!reconnect)
                return this.db;
            this.db.end();
        }

        if(!this.config)
            await this.configure();
        this.db = await this.createConnection(this.config);
        console.info(`DB Connection to '${this.config.host}' Successful`);
        return this.db;
    }

    async selectDatabaseByRequest(req) {
        if(this.config.multiDomain === 'y' && req) {
            // const parse = require('url').parse(req.url);
            const hostname = req.get('host').split(':')[0];
            if(typeof this.cacheHostname[hostname] !== "undefined")
                return this.cacheHostname[hostname];
            const domainDB = await this.getDomainDB(null);
            const domain = await domainDB.fetchDomainByHostname(hostname);
            let database;
            if(domain) {
                database = domain.database;
            } else {
                database = hostname.replace('.', '_') + '_cms';
            }
            await this.configureDatabase(database, hostname, false);
            this.cacheHostname[hostname] = database;
            return database;
        } else {
            return this.config.database;
        }
    }



    async createConnection(config) {
        return await new Promise( ( resolve, reject ) => {
            const db = mysql.createConnection(config);
            db.on('error', (err) => {
                console.error("DB Error", err);
                // if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
                //     // db.end();
                // }
            });
            db.connect({}, (err) => {
                if (err) {
                    console.error(`DB Connection to '${config.host}' Failed`, err.message);
                    reject(err);
                } else {
                    resolve(db);
                }
            });
        });
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

    async queryAsync(sql, values) {
        const db = await this.get();
        return await queryAsync(db, sql, values, this.config && this.config.debug === true);
    }

}



function queryAsync(db, sql, values, debug) {
    return new Promise( ( resolve, reject ) => {
        try {
            db.query(sql, values, (err, rows) => {
                if (debug)
                    err ? console.error(err.message, sql, values || "No Values") : console.log(sql, values || "No Values");
                err ? reject(err) : resolve(rows);
            });
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}

exports.DatabaseManager = new DatabaseManager();