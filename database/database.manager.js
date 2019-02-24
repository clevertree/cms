
const mysql = require('mysql');

const { LocalConfig } = require('../config/local.config');
// const { FileManager } = require('../service/file/file.manager');
// const { UserAPI } = require('../user/user.api');

// const { ContentDatabase } = require('../article/article.database');
// const { UserDatabase } = require('../user/user.database');
// const { ConfigDatabase } = require('../config/config.database');

// const BASE_DIR = path.resolve(path.dirname(__dirname));

class DatabaseManager {
    constructor() {
        // this.config = null;
        this.db = null;
        this.primaryDatabase = null;
        this.debug = false;
        this.multiDomain = false;
        this.cacheHostname = {};
    }

    get isConnected() { return !!this.db;}
    get isAvailable() { return !!this.primaryDatabase;}

    // getArticleDB(database=null)    { return new (require('../article/article.database').ContentDatabase)(database); }
    // getUserDB(database=null)       { return new (require('../user/user.database').UserDatabase)(database); }
    // getConfigDB(database=null)     { return new (require('../config/config.database').ConfigDatabase)(database); }
    getDomainDB(database=null)     { return new (require('../domain/domain.database').DomainDatabase)(database); }

    async configure(promptCallback=null) {
        if(this.db) {
            console.warn("Closing existing DB Connection");
            this.db.end();
        }

        const localConfig = new LocalConfig(promptCallback);
        const dbConfig = await localConfig.getOrCreate('database');
        const defaultHostname     = (require('os').hostname()).toLowerCase();
        // const defaultDatabaseName =
        if(!dbConfig.database)
            dbConfig.database = 'localhost_cms'; // defaultHostname.replace('.', '_') + '_cms';

        let attempts = promptCallback ? 3 : 1;
        while(attempts-- > 0) {
            if(promptCallback) {
                await localConfig.promptValue('database.host', `Please enter the Database Host`, dbConfig.host || 'localhost');
                await localConfig.promptValue('database.user', `Please enter the Database User Name`, dbConfig.user || 'cms_user');
                await localConfig.promptValue('database.password', `Please enter the Password for Database User '${dbConfig.user}'`, dbConfig.password || 'cms_pass', 'password');
                await localConfig.promptValue('database.database', `Please enter the Database Name`, dbConfig.database);
                await localConfig.promptValue('database.multiDomain', `Enable Multi-domain hosting (Requires admin MYSQL Privileges) [y or n]?`, dbConfig.multiDomain || false, 'boolean');
            }
                // dbConfig.multiDomain = dbConfig.multiDomain && dbConfig.multiDomain === 'y';

            const connectConfig = Object.assign({
                host: 'localhost',
                user: 'cms_user',
                password: 'cms_pass',
                // insecureAuth: true,
            }, dbConfig);
            delete connectConfig.database;
            if(attempts <= 0) {
                this.db = await this.createConnection(connectConfig);
            } else try {
                this.db = await this.createConnection(connectConfig);
            } catch (e) {
                console.error(e.message);
                if(attempts <= 0)
                    throw e;
                continue;
                // console.info("Database attempt #" + attempts);
            }
            break;
        }

        if(typeof dbConfig.debug !== "undefined")
            this.debug = dbConfig.debug;
        if(typeof dbConfig.multiDomain !== "undefined")
            this.multiDomain = dbConfig.multiDomain && dbConfig.multiDomain !== 'n';

        if(promptCallback)
            await localConfig.saveAll();

        // Configure Databases
        this.primaryDatabase = dbConfig.database;

        await this.configureDatabase(this.primaryDatabase, defaultHostname, promptCallback);
    }



    async configureDatabase(database, hostname, promptCallback=null) {
        const databaseExists = await this.queryAsync(`SHOW DATABASES LIKE '${database}'`);
        if(databaseExists.length === 0) {
            console.log("Database not found: ", database);
            await this.queryAsync(`CREATE SCHEMA \`${database}\``);
            console.log(`Created new schema: \`${database}\``);
        } else {
            console.info("Database found: ", database);
        }


        // await this.queryAsync(`USE \`${database}\``);

        // Configure Tables
        const tableClasses = [
            require('../user/user.database').UserDatabase,
            require('../content/content.database').ContentDatabase,
            require('../config/config.database').ConfigDatabase,
        ];

        for(let i=0; i<tableClasses.length; i++) {
            const table = new tableClasses[i](database);
            await table.configure(promptCallback);
        }

        // Configure Domain
        const domainDB = this.getDomainDB(this.primaryDatabase);
        if(this.primaryDatabase === database)
            await domainDB.configure();
        const domain = await domainDB.fetchDomainByHostname(hostname);
        if(!domain) {
            await domainDB.insertDomain(hostname, database);
            console.log(`Created domain entry: ${hostname} => ${database}`);
        } else {
            console.info(`Found domain entry: ${hostname} => ${database}`);
        }


        // Init Task Manager
        // const { TaskAPI } = require('../service/task/task.manager');
        // await TaskAPI.configure(database);

    }



    // async get() {
    //     if(this.db)
    //         return this.db;
    //
    //
    //     const localConfig = new LocalConfig();
    //     if(!localConfig.has('database'))
    //         throw new Error("Database not configured");
    //     const dbConfig = await localConfig.getOrCreate('database');
    //
    //
    //     const connectConfig = Object.assign({
    //         host: 'localhost',
    //         user: 'cms_user',
    //         password: 'cms_pass',
    //         // insecureAuth: true,
    //     }, dbConfig);
    //     delete connectConfig.database;
    //     const db = await this.createConnection(connectConfig);
    //
    //     // Configure Databases
    //     let defaultHostname     = (require('os').hostname()).toLowerCase();
    //     this.primaryDatabase = dbConfig.database;
    //     if(!this.primaryDatabase)
    //         this.primaryDatabase = defaultHostname.replace('.', '_') + '_cms';
    //
    //     await this.configureDatabase(this.primaryDatabase, defaultHostname, true);
    //
    //     if(typeof dbConfig.debug !== "undefined")
    //         this.debug = dbConfig.debug;
    //     if(typeof dbConfig.multiDomain !== "undefined")
    //         this.multiDomain = dbConfig.multiDomain && dbConfig.multiDomain !== 'n';
    //
    //     const databaseConfig = await localConfig.getOrCreate('database');
    //     Object.assign(dbConfig, databaseConfig);
    //     await localConfig.saveAll();
    //     this.db = db;
    //     return db;
    // }

    async selectDatabaseByRequest(req) {
        if(this.multiDomain && req) {
            // const parse = require('url').parse(req.url);
            let hostname = req.get ? req.get('host') : req.headers.host;
            hostname = hostname.split(':')[0];
            if(typeof this.cacheHostname[hostname] !== "undefined")
                return this.cacheHostname[hostname];
            const domainDB = this.getDomainDB(this.primaryDatabase);
            const domain = await domainDB.fetchDomainByHostname(hostname);
            let database;
            if(domain) {
                database = domain.database;
            } else {
                database = hostname.replace('.', '_') + '_cms';
            }
            await this.configureDatabase(database, hostname);
            this.cacheHostname[hostname] = database;
            return database;
        } else {
            return this.primaryDatabase;
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
                    console.error(`DB Connection to '${config.host}' failed`, err.message);
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
        // const db = this.get();
        if(!this.db)
            throw new Error("Database is not connected");
        return await queryAsync(this.db, sql, values, this.debug);
        // if(!this.primaryDatabase)
        //     throw new Error("Database is not available");
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