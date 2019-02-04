
const mysql = require('mysql');

const { LocalConfig } = require('../config/local.config');
const { FileManager } = require('../service/file/file.manager');

// const { ArticleDatabase } = require('../article/article.database');
// const { UserDatabase } = require('../user/user.database');
// const { ConfigDatabase } = require('../config/config.database');

// const BASE_DIR = path.resolve(path.dirname(__dirname));

class DatabaseManager {
    constructor() {
        this.config = null;
        this.db = null;
    }

    // TODO: database name instead of req
    async getArticleDB(req=null)    { return new (require('../article/article.database').ArticleDatabase)(await this.selectDatabaseByHost(req)); }
    async getUserDB(req=null)       { return new (require('../user/user.database').UserDatabase)(await this.selectDatabaseByHost(req)); }
    async getConfigDB(req=null)     { return new (require('../config/config.database').ConfigDatabase)(await this.selectDatabaseByHost(req)); }


    async configure(config=null, forcePrompt=0) {
        const localConfig = new LocalConfig(config, !config);
        const dbConfig = await localConfig.getOrCreate('database');

        if(forcePrompt || !dbConfig.database || !dbConfig.user || !dbConfig.host) {
            let hostname        = (require('os').hostname()).toLowerCase();
            await localConfig.promptValue('database.host', `Please enter the Database Host`, dbConfig.host || 'localhost');
            await localConfig.promptValue('database.user', `Please enter the Database User Name`, dbConfig.user || 'root');
            await localConfig.promptValue('database.password', `Please enter the Password for Database User '${dbConfig.user}'`, null, 'password');
            await localConfig.promptValue('database.database', `Please enter the Database Name`, dbConfig.database || hostname.replace('.', '_') + '_cms');
        }
        try {
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

        // Configure Databases
        const tables = [
            await this.getUserDB(), // TODO: users first
            await this.getArticleDB(),
            await this.getConfigDB(),
        ];
        for(var i=0; i<tables.length; i++)
            await tables[i].configure(config);

        return dbConfig;
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
        return this.db;
    }

    async selectDatabaseByHost(req) {
        return this.config.database;
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
                    console.info(`DB Connecting to '${config.host}' Successful`);
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