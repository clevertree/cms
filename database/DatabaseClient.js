const mysql = require('mysql');

const LocalConfig = require('../config/LocalConfig');
const InteractiveConfig = require('../config/InteractiveConfig');

const Tables = {
    UserTable:              require('../user/UserTable'),
    UserMessageTable:       require('../user/message/UserMessageTable'),
    ContentTable:           require('../content/ContentTable'),
    ContentRevisionTable:   require('../content/revision/ContentRevisionTable'),
    DomainTable:            require('../server/DomainTable'),
};

class DatabaseManager {
    constructor(config) {
        // this.config = null;
        this.db = null;
        this.dbConfig = Object.assign({
            host: 'localhost',
            user: 'cms_user',
            password: 'cms_pass',
            database: 'localhost_cms'
            // insecureAuth: true,
        }, config.database||{});
        // this.debug = false;
        // this.multiDomain = false;
        this.cacheHostname = {};
        this.initiated = false;
    }

    get primaryDatabase() { return this.dbConfig.database; }

    isConnected() { return !!this.db;}
    isAvailable() { return this.db && this.db.state === 'authenticated';}
    isMultipleDomainMode() { return this.dbConfig.multiDomain === true;}

    getPrimaryDomainTable()       { return new (require('../server/DomainTable'))(this.primaryDatabase); }


    async init() {
        await this.initDatabase(this.primaryDatabase);
    }

    async initDatabase(database) {
        if(this.initiated === null)
            throw new Error("Database is initializing");
        this.initiated = null;

        // Initiate Connection
        await this.createConnection();

        // Initiate Database
        const databaseExists = await this.queryAsync(`SHOW DATABASES LIKE '${database}'`);
        if(databaseExists.length === 0) {
            console.log("Database not found: ", database);
            await this.queryAsync(`CREATE SCHEMA \`${database}\``);
            console.log(`Created new schema: \`${database}\``);
        } else {
            console.info("Database found: ", database);
        }


        // Initiate Tables
        const tableClasses = Object.values(Tables);

        for(let i=0; i<tableClasses.length; i++) {
            const table = new tableClasses[i](database, this);
            await table.init(this);
        }
        this.initiated = true;
    }

    /** Configure Interactively **/
    async configure(interactive=false) {
        const localConfig = new LocalConfig();
        let dbConfig = await localConfig.getOrCreate('database');
        Object.assign(dbConfig, this.dbConfig);
        const interactiveConfig = new InteractiveConfig(dbConfig, interactive);

        let attempts = 3;
        while(attempts-- > 0) {
            console.info("Configuring Database");
            await interactiveConfig.promptValue('host', `Please enter the Database Host`, dbConfig.host || 'localhost');
            await interactiveConfig.promptValue('user', `Please enter the Database User Name`, dbConfig.user || 'cms_user');
            await interactiveConfig.promptValue('password', `Please enter the Password for Database User '${dbConfig.user}'`, dbConfig.password || 'cms_pass', 'password');
            await interactiveConfig.promptValue('database', `Please enter the Database Name`, dbConfig.database);
            await interactiveConfig.promptValue('multiDomain', `Enable Multi-domain hosting (Requires admin MYSQL Privileges) [y or n]?`, dbConfig.multiDomain || false, 'boolean');

            try {
                await this.createConnection(dbConfig);
                this.dbConfig = dbConfig;
                await localConfig.saveAll();
            } catch (e) {
                console.error(e.message);
                if(attempts <= 0)
                    throw e;
                continue;
                // console.info("Database attempt #" + attempts);
            }
            break;
        }

        const defaultHostname     = (require('os').hostname()).toLowerCase();
        await this.configureDatabase(this.primaryDatabase, defaultHostname, interactive);
        // Configure all databases? no, only primary
    }



    /** Configure Database Interactively **/
    async configureDatabase(database, hostname, interactive=false) {

        // await this.queryAsync(`USE \`${database}\``);

        // Configure Tables
        const tableClasses = Object.values(Tables);

        for(let i=0; i<tableClasses.length; i++) {
            const table = new tableClasses[i](database, this);
            await table.configure(hostname, interactive);
        }

        if(this.isMultipleDomainMode()) {
            // Configure Domain
            // const DomainTable = this.getPrimaryDomainTable();
            // if (this.primaryDatabase === database)
            //     await DomainTable.configure();
            // const domain = await DomainTable.fetchDomainByHostname(hostname);
            // if (!domain) {
            //     await DomainTable.insertDomain(hostname, database);
            //     console.log(`Created domain entry: ${hostname} => ${database}`);
            // } else {
            //     if (!domain.database) {
            //         await DomainTable.updateDomain(hostname, database);
            //         console.info(`Updated domain entry: ${hostname} => ${database}`);
            //
            //     } else {
            //         console.info(`Found domain entry: ${hostname} => ${database}`);
            //     }
            // }
        }


        // Init Task Manager
        // const TaskAPI = require('../service/task/task.manager');
        // await TaskAPI.configure(database);

    }


    getHostnameFromRequest(req) {
        let hostname = req.get ? req.get('host') : req.headers.host;
        if(!hostname)
            throw new Error("Host name is required for multi-domain serving");
        hostname = hostname.split(':')[0];
        return hostname;
    }

    async selectDatabaseByHost(hostname) {
        if(this.isMultipleDomainMode() && hostname) {
            // const parse = require('url').parse(req.url);

            if(typeof this.cacheHostname[hostname] !== "undefined")
                return this.cacheHostname[hostname];

            const DomainTable = this.getPrimaryDomainTable();
            const domain = await DomainTable.fetchDomainByHostname(hostname);
            let database = null;
            if(domain) {
                database = domain.database;
            } else {
                await DomainTable.insertDomain(hostname, null);
            }
            if(database) {
                const databaseResult = await this.queryAsync(`SHOW DATABASES LIKE '${database}'`);
                if(databaseResult.length === 0) {
                    console.warn(`Database entry for ${hostname} does not correspond with an existing database: ${database}`);
                    database = null;
                }
            }
            if(!database && hostname === 'localhost')
                database = this.primaryDatabase;
            if(!database) {
                // Redirect user
                throw Object.assign(new Error("Database has not been configured for " + hostname), {
                    redirect: '/:task/database-configure'
                });
            }
            await this.configureDatabase(database, hostname); // Once configured manually, databases can be auto configured from then on.
            this.cacheHostname[hostname] = database;
            return database;
        } else {
            return this.primaryDatabase;
        }

    }

    async selectDatabaseByRequest(req, orThrowError=true) {
        if(orThrowError) {
            let hostname = this.getHostnameFromRequest(req);
            return await this.selectDatabaseByHost(hostname);
        }
        try {
            let hostname = this.getHostnameFromRequest(req);
            return await this.selectDatabaseByHost(hostname);
        } catch (e) {
            console.warn(req.url, e.message);
            return null;
        }
    }



    async createConnection(dbConfig=null) {
        dbConfig = dbConfig || this.dbConfig;
        if(!dbConfig)
            throw new Error("Invalid Database Config");
        if(this.db) {
            console.warn("Closing existing DB Connection");
            this.db.end();
        }

        // throw new Error("Database connection already exists");
        const connectConfig = Object.assign({}, dbConfig);
        delete connectConfig.database;
        this.db = mysql.createConnection(connectConfig);
        this.db.on('error', (err) => {
            console.error("DB Error", err);
            if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server was lost
                this.db.end();
                this.db = null;
                console.warn("Reconnecting to database...");
                this.createConnection(connectConfig);
            }
        });
        return await new Promise( ( resolve, reject ) => {
            this.db.connect({}, (err) => {
                if (err) {
                    console.error(`DB Connection to '${connectConfig.host}' failed`, err.message);
                    this.db = null;
                    reject(err);
                } else {
                    console.log(`DB Connection to '${connectConfig.host}' successful`);
                    resolve(this.db);
                }
            });
        });
    }


    async queryAsync(sql, values) {

        if(!this.db || this.db.state === 'disconnected') {
            this.db = null;
            if(this.initiated === false)
                await this.init();           // Lazy Load
            await this.createConnection();
        }

        return await queryAsync(this.db, sql, values, this.dbConfig.debug);
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

module.exports = DatabaseManager;