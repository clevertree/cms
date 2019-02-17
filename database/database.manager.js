
const mysql = require('mysql');

const { LocalConfig } = require('../config/local.config');
// const { FileManager } = require('../service/file/file.manager');
// const { UserAPI } = require('../user/user.api');

// const { ArticleDatabase } = require('../article/article.database');
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

    async getArticleDB(database=null)    { return new (require('../article/article.database').ArticleDatabase)(database); }
    async getUserDB(database=null)       { return new (require('../user/user.database').UserDatabase)(database); }
    async getConfigDB(database=null)     { return new (require('../config/config.database').ConfigDatabase)(database); }
    async getDomainDB(database=null)     { return new (require('../service/domain/domain.database').DomainDatabase)(database); }

    async autoConfigure() {
        const localConfig = new LocalConfig();
        if(await localConfig.has('database')) {
            const databaseConfig = await localConfig.getOrCreate('database');
            await this.configure(databaseConfig);
        }

    }

    async configure(config=null) {

        // const serverConfig = await localConfig.getOrCreate('server');
        // let defaultDatabaseName = defaultHostname.replace('.', '_') + '_cms';

        // if(forcePrompt || !dbConfig.database || !dbConfig.user || !dbConfig.host) {
        //     await localConfig.promptValue('database.host', `Please enter the Database Host`, dbConfig.host || 'localhost');
        //     await localConfig.promptValue('database.user', `Please enter the Database User Name`, dbConfig.user || 'cms_user');
        //     await localConfig.promptValue('database.password', `Please enter the Password for Database User '${dbConfig.user}'`, dbConfig.password || 'cms_pass', 'password');
        //     await localConfig.promptValue('database.database', `Please enter the Database Name`, dbConfig.database || defaultDatabaseName);
        //     // await localConfig.promptValue('database.multiDomain', `Enable Multi-domain hosting? [y or n]`, dbConfig.multiDomain || 'n');
        //     // dbConfig.multiDomain = dbConfig.multiDomain && dbConfig.multiDomain === 'y';
        //     // localConfig.saveAll();
        // }
        if(this.db) {
            console.warn("Closing existing DB Connection");
            this.db.end();
        }

        const connectConfig = Object.assign({
            host: 'localhost',
            user: 'cms_user',
            password: 'cms_pass',
            // insecureAuth: true,
        }, config);
        delete connectConfig.database;
        this.db = await this.createConnection(connectConfig);

        // Configure Databases
        let defaultHostname     = (require('os').hostname()).toLowerCase();
        this.primaryDatabase = config.database;
        if(!this.primaryDatabase)
            this.primaryDatabase = defaultHostname.replace('.', '_') + '_cms';

        await this.configureDatabase(this.primaryDatabase, defaultHostname, true);

        if(typeof config.debug !== "undefined")
            this.debug = config.debug;
        if(typeof config.multiDomain !== "undefined")
            this.multiDomain = config.multiDomain && config.multiDomain !== 'n';

        const localConfig = new LocalConfig();
        const databaseConfig = await localConfig.getOrCreate('database');
        Object.assign(config, databaseConfig);
        await localConfig.saveAll();

    }

    async configureDatabase(database, hostname, insertDomainTable=false) {
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
        const tables = [
            await this.getUserDB(database),
            await this.getArticleDB(database),
            await this.getConfigDB(database),
        ];
        if(insertDomainTable)
            tables.push( await this.getDomainDB(database));
        for(let i=0; i<tables.length; i++)
            await tables[i].configure();

        // Configure Domain
        const domainDB = await this.getDomainDB(this.primaryDatabase);
        domainDB.configure();
        const domain = await domainDB.fetchDomainByHostname(hostname);
        if(!domain) {
            await domainDB.insertDomain(hostname, database);
            console.log(`Created domain entry: ${hostname} => ${database}`);
        } else {
            console.info(`Found domain entry: ${hostname} => ${database}`);
        }

        // Set up admin user
        await require('../user/user.api').UserAPI.configureAdmin(database, hostname);

        // Set up default config
        const configDB = await this.getConfigDB(database);
        let userProfile = await configDB.fetchConfigValue('user.profile');
        if (!userProfile)
            await configDB.updateConfigValue('user.profile', JSON.stringify([
                {name: 'name', title: "Full Name"},
                {name: 'description', type: "textarea", title: "Description"},
            ]));


        // Init Task Manager
        const { TaskManager } = require('../service/task/task.manager');
        await TaskManager.configure(database);

    }

    async selectDatabaseByRequest(req) {
        if(this.multiDomain && req) {
            // const parse = require('url').parse(req.url);
            const hostname = req.get('host').split(':')[0];
            if(typeof this.cacheHostname[hostname] !== "undefined")
                return this.cacheHostname[hostname];
            const domainDB = await this.getDomainDB(this.primaryDatabase);
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
        if(!this.db)
            throw new Error("Database is not connected");
        // if(!this.primaryDatabase)
        //     throw new Error("Database is not available");
        return await queryAsync(this.db, sql, values, this.debug);
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