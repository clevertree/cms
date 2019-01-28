const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

const { ConfigManager } = require('../config/config.manager');
const { FileManager } = require('../file/file.manager');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class DatabaseManager {
    constructor() {
        this.hosts = {};

    }

    // async init() {
    //     for(var i=0; i<4; i++) {
    //         try {
    //             await this.get();
    //             break;
    //         } catch (e) {
    //             console.error(e);
    //             await this.sleep(3000);
    //             // await this.loadConfig();
    //         }
    //     }
    // }

    async get(reconnect=false, host=null) {
        if(!host)
            host = require('os').hostname();

        if (typeof this.hosts[host] !== "undefined"){
            if(!reconnect)
                return this.hosts[host];
            this.hosts[host].end();
        }

        const dbConfig = await this.loadConfig(host);
        const db = await this.initDatabase(dbConfig);

        this.hosts[dbConfig.host] = db;
        return db;
    }


    async loadConfig(hostname) {
        const dbConfig = await ConfigManager.getOrCreate('database');
        hostname = (hostname || require('os').hostname()).toLowerCase();

        if(!dbConfig.database || !dbConfig.user || !dbConfig.host) {
            dbConfig.database = (await ConfigManager.prompt(`Please enter the Database Name`, dbConfig.database || 'ct_' + hostname));
            dbConfig.user = (await ConfigManager.prompt(`Please enter the Database User Name`, dbConfig.user || 'root')).trim();
            dbConfig.password = (await ConfigManager.prompt(`Please enter the Password for Database User '${dbConfig.user}'`));
            dbConfig.host = (await ConfigManager.prompt(`Please enter the Database Host`, dbConfig.host || hostname));
        }

        return dbConfig;
    }

    async initDatabase(config) {
        if(!config.database)
            throw new Error("Missing property: database");
        // if(!config.user)
        //     throw new Error("Missing property: user");
        // if(!config.host)
        //     throw new Error("Missing property: host");
        // this.config = config;
        // config.debug = true;
        let db = null;
        try {
            db = await this.createConnection(config);
            await this.queryAsync(db, `USE ${config.database}`);
        } catch (e) {
            if(e.code === "ER_BAD_DB_ERROR") {
                const repairConfig = Object.assign({}, config);
                delete repairConfig.database;
                repairConfig.multipleStatements = true;
                this.db = await this.createConnection(repairConfig);
                const repairSQLPath = path.resolve(__dirname + '/database.sql');
                let repairSQL = await await FileManager.readFileAsync(repairSQLPath, "utf8");
                repairSQL = `CREATE SCHEMA \`${config.database}\`; USE \`${config.database}\`; ` + repairSQL;
                await this.queryAsync(db, repairSQL);
                this.db = await this.createConnection(config);
                return;
            }
            throw e;
        }

        // Save working config. TODO: every init?
        await ConfigManager.saveAll();
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
            console.log(sql);
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
