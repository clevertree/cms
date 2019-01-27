const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class DatabaseManager {
    constructor() {
        this.hosts = {};

    }

    async init() {
        for(var i=0; i<4; i++) {
            try {
                await this.get();
                break;
            } catch (e) {
                console.error(e);
                await this.sleep(3000);
                // await this.loadConfig();
            }
        }
    }

    async get(reconnect=false, host=null) {
        if(!host)
            host = require('os').hostname();
        if(!reconnect) {
            if (typeof this.hosts[host] !== "undefined")
                return this.hosts[host];
        }

        const dbConfig = await this.loadConfig(host);
        host = dbConfig.host;
        if(this.hosts[host])
            this.hosts[host].end();
        const db = await this.createConnection(dbConfig);
        this.hosts[host] = db;
        return db;
    }


    async createConnection(dbConfig) {
        const db = mysql.createConnection(dbConfig);
        return await new Promise( ( resolve, reject ) => {
            db.on('error', (err) => {
                console.error("DB Error", err);
                // if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
                //     // db.end();
                // }
            });
            db.connect({}, (err) => {
                if (err) {
                    console.error(`DB Connection to '${dbConfig.database}' Failed`, err.message);
                    reject(err);
                } else {
                    console.info(`DB Connecting to '${dbConfig.database}' Successful`);
                    resolve(db);
                }
            });
        });
    }

    async loadConfig(hostname) {
        hostname = (hostname || require('os').hostname()).toLowerCase();
        const configPath = path.resolve(BASE_DIR + '/config.js');
        let globalConfig = {}, dbConfig = {};
        try {
            // noinspection JSFileReferences
            globalConfig = require(configPath);
            dbConfig = globalConfig.db;
            if(!dbConfig)
                throw new Error("Invalid Config");
        } catch (e) {
            console.error("Config file error: " + e.message);
            await this.sleep(1000);
        }

        if(!dbConfig)
            dbConfig = {};
        globalConfig.db = dbConfig;
        let oldConfigJSON = JSON.stringify(globalConfig);

        if(!dbConfig.database)
            dbConfig.database = (await this.prompt(`Config entry missing: Please enter the Database Name [Default: ${hostname}]`)).trim() || hostname || 'clevertree';
        if(!dbConfig.user)
            dbConfig.user = (await this.prompt(`Config entry missing: Please enter the Database User Name [Default: root]`)).trim() || 'root';
        if(!dbConfig.password)
            dbConfig.password = (await this.prompt(`Config entry missing: Please enter the Database Password for ${dbConfig.user}`)).trim() || null;
        if(!dbConfig.host)
            dbConfig.host = (await this.prompt(`Config entry missing: Please enter the Database Host [Default: ${hostname}]`)).trim() || hostname;

        let newConfigJSON = JSON.stringify(globalConfig);
        if(newConfigJSON !== oldConfigJSON) {
            try {
                // TODO: write config on successful connection
                await fs.writeFileSync(configPath,
                    "module.exports = " + JSON.stringify(globalConfig, null, 4)
                    , 'utf8');
                console.info("Config written successfully: ", globalConfig);
            } catch (e) {
                console.error("Failed to write config: ", e.stack);
            }
        }

        return dbConfig;
    }

    async prompt(text) {
        var standard_input = process.stdin;
        standard_input.setEncoding('utf-8');
        return new Promise( ( resolve, reject ) => {
            console.log(text);
            standard_input.on('data', function (data) {
                resolve (data);
            });
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class Database {
    constructor(name, user, password, host) {
        this.config = {name, user, password, host};
    }
    
    
}

exports.DatabaseManager = new DatabaseManager();
