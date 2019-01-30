const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

const { ConfigManager } = require('../config/config.manager');
const { FileManager } = require('../file/file.manager');

const { ArticleDatabase } = require('../article/article.database');
const { UserDatabase } = require('../user/user.database');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class DatabaseManager {
    constructor() {
        this.hosts = {};

    }

    async getArticleDB(req=null)    { return new ArticleDatabase(await this.get(req)); }
    async getUserDB(req=null)       { return new UserDatabase(await this.get(req)); }


    async configure(interactive=false, req=null) {
        const dbConfig = await ConfigManager.getOrCreate('database');
        // if(!dbConfig.database && !prompt)
        //     throw new Error("Prompt required to select database name")
        for(let i=0; i<4; i++) {
            try {

                if(!dbConfig.database || !dbConfig.user || !dbConfig.host) {
                    let hostname        = (require('os').hostname()).toLowerCase();
                    dbConfig.database   = dbConfig.database || 'ct_' + hostname;
                    dbConfig.user       = dbConfig.user || 'root';
                    dbConfig.host       = dbConfig.host || hostname;

                    if(interactive) {
                        dbConfig.database = await ConfigManager.prompt(`Please enter the Database Name`, dbConfig.database);
                        dbConfig.user = await ConfigManager.prompt(`Please enter the Database User Name`, dbConfig.user);
                        dbConfig.password = await ConfigManager.prompt(`Please enter the Password for Database User '${dbConfig.user}'`);
                        dbConfig.host = await ConfigManager.prompt(`Please enter the Database Host`, dbConfig.host);
                    }
                }

                try {
                    await this.createConnection(dbConfig);
                } catch (e) {
                    if(e.code === "ER_BAD_DB_ERROR") {
                        const repairConfig = Object.assign({}, dbConfig);
                        delete repairConfig.database;
                        const repairDB = await this.createConnection(repairConfig);
                        await this.queryAsync(repairDB, `CREATE SCHEMA \`${dbConfig.database}\``);
                        await this.queryAsync(repairDB, `USE \`${dbConfig.database}\``);
                        console.info(`Created new schema: \`${dbConfig.database}\``)
                    } else {
                        throw e;
                    }
                }

                // Save working config. TODO: every init?
                await ConfigManager.saveAll();
            } catch (e) {
                console.error(e);
                continue;
            }
            break;
        }


        // Configure Databases
        const databases = [
            await this.getArticleDB(req),
            await this.getUserDB(req),
        ];
        for(var i=0; i<databases.length; i++)
            await databases[i].configure(interactive);

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

        const dbConfig = await ConfigManager.getOrCreate('database');
        const db = await this.createConnection(dbConfig);

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

    // sleep(ms) {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }
}

exports.DatabaseManager = new DatabaseManager();
