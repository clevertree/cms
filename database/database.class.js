const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class Database {
    constructor() {

    }

    async init() {
        await this.loadConfig();

        for(var i=0; i<4; i++) {
            try {
                await this.connect();
                break;
            } catch (e) {
                console.error(e);
                await this.sleep(3000);
            }
        }
    }


    connect() {
        // Mysql
        const dbConfig = this.config;
        if(this.db)
            this.db.end();
        const db = mysql.createConnection(dbConfig);
        this.db = db;

        // setTimeout(() => this.createDBConnection(), 300000);

        return new Promise( ( resolve, reject ) => {
            db.on('error', (err) => {
                // reject(err);
                console.error("DB Error", err);
                // if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
                //     setTimeout(() => this.createDBConnection(), 3000);
                //     // db.end();
                // }
            });
            db.connect({}, (err) => {
                if (err) {
                    console.error(`DB Connection to '${dbConfig.database}' Failed`, err.message);
                    reject(err);
                    // setTimeout(() => this.createDBConnection(), 3000);
                    // db.end();
                } else {
                    console.info(`DB Connecting to '${dbConfig.database}' Successful`);
                    resolve(db);
                }
            });
        });
    }

    async loadConfig() {
        const configPath = path.resolve(BASE_DIR + '/config.js');
        let globalConfig = {};
        try {
            // noinspection JSFileReferences
            globalConfig = require(configPath);
            this.config = globalConfig.mysql;
            if(!this.config)
                throw new Error("Invalid Config");
        } catch (e) {
            console.error("Config file error: " + e.message);
        }

        if(!this.config)
            this.config = {};
        globalConfig.mysql = this.config;
        let oldConfigJSON = JSON.stringify(globalConfig);

        if(!this.config.database)
            this.config.database = (await this.prompt("Config entry missing: Please enter the Database Name:")).trim();
        if(!this.config.user)
            this.config.user = (await this.prompt("Config entry missing: Please enter the Database User Name [Default: root]:")).trim() || 'root';
        if(!this.config.password)
            this.config.password = (await this.prompt("Config entry missing: Please enter the Database Password for [" + this.config.user + "]:")).trim() || null;
        if(!this.config.host)
            this.config.host = (await this.prompt("Config entry missing: Please enter the Database Host [Default: localhost]:")).trim() || 'localhost';

        let newConfigJSON = JSON.stringify(globalConfig);
        if(newConfigJSON !== oldConfigJSON) {
            try {
                await fs.writeFileSync(configPath,
                    "module.exports = " + JSON.stringify(globalConfig, null, 4)
                    , 'utf8');
                console.info("Config written successfully: ", globalConfig);
            } catch (e) {
                console.error("Failed to write config: ", e.stack);
            }
        }

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

exports.Database = Database;