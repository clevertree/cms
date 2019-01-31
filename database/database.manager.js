
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

const { LocalConfig } = require('../config/local.config');
const { FileManager } = require('../file/file.manager');

const { ArticleDatabase } = require('../article/article.database');
const { UserDatabase } = require('../user/user.database');
const { ConfigDatabase } = require('../config/config.database');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class DatabaseManager {
    constructor() {
        this.hosts = {};
        this.config = null;
    }

    // TODO: database name instead of req
    async getArticleDB(req=null)    { return new ArticleDatabase(await this.get(req)); }
    async getUserDB(req=null)       { return new UserDatabase(await this.get(req)); }
    async getConfigDB(req=null)     { return new ConfigDatabase(await this.get(req)); }


    async configure(interactive=false, config=null) {
        const localConfig = new LocalConfig(interactive, config, !config);
        const dbConfig = await localConfig.getOrCreate('database');

        let hostname        = (require('os').hostname()).toLowerCase();

        if(!dbConfig.database || !dbConfig.user || !dbConfig.host) {
            await localConfig.promptValue('database.host', `Please enter the Database Host`, dbConfig.host || hostname);
            await localConfig.promptValue('database.user', `Please enter the Database User Name`, dbConfig.user || 'root');
            await localConfig.promptValue('database.password', `Please enter the Password for Database User '${dbConfig.user}'`);
            await localConfig.promptValue('database.database', `Please enter the Database Name`, dbConfig.database || 'cms_' + hostname);
        }
        try {
            const db = await this.createConnection(dbConfig);
            db.end();
        } catch (e) {
            if(e.code === "ER_BAD_DB_ERROR") {
                const repairConfig = Object.assign({}, dbConfig);
                delete repairConfig.database;
                const repairDB = await this.createConnection(repairConfig);
                await this.queryAsync(repairDB, `CREATE SCHEMA \`${dbConfig.database}\``);
                await this.queryAsync(repairDB, `USE \`${dbConfig.database}\``);
                console.info(`Created new schema: \`${dbConfig.database}\``);
                repairDB.end();
                const db = await this.createConnection(dbConfig);
                db.end();
            } else {
                throw e;
            }
        }

        this.config = dbConfig;

        // Configure Databases
        const databases = [
            await this.getUserDB(), // TODO: users first
            await this.getArticleDB(),
            await this.getConfigDB(),
        ];
        for(var i=0; i<databases.length; i++)
            await databases[i].configure(interactive, config);

        return dbConfig;
    }

    async get(req=null, reconnect=false) {
        let host = req ? req.headers.host.split(':')[0] : null;
        if(!host)
            host = require('os').hostname();
        host = host.toLowerCase();

        if (typeof this.hosts[host] !== "undefined"){
            if(!reconnect)
                return this.hosts[host];
            this.hosts[host].end();
        }

        if(!this.config)
            await this.configure(false);
        const db = await this.createConnection(this.config);

        this.hosts[host] = db;
        return db;
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

    queryAsync(db, sql, values, cb) {
        if(cb)
            return db.query(sql, values, cb);
        return new Promise( ( resolve, reject ) => {
            db.query(sql, values, ( err, rows ) => {
                // if(ConfigManager.get('debug', false))
                    err ? console.error (err.message, sql, values || "No Values") : console.log (sql, values || "No Values");
                err ? reject (err) : resolve (rows);
            });
        });
    }

}

exports.DatabaseManager = new DatabaseManager();
