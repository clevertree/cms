
const mysql = require('mysql');

const { LocalConfig } = require('../config/local.config');
const { InteractiveConfig } = require('../config/interactive.config');

class DatabaseManager {
    constructor() {
        // this.config = null;
        this.db = null;
        this.dbConfig = {
            host: 'localhost',
            user: 'cms_user',
            password: 'cms_pass',
            database: 'localhost_cms'
            // insecureAuth: true,
        };
        // this.debug = false;
        // this.multiDomain = false;
        this.cacheHostname = {};
    }

    get primaryDatabase() { return this.dbConfig.database; }

    isConnected() { return !!this.db;}
    isAvailable() { return this.db && this.db.state === 'authenticated';}
    isMultipleDomainMode() { return this.dbConfig.multiDomain === true;}

    getPrimaryDomainTable()       { return new (require('../server/domain.table').DomainTable)(this.primaryDatabase); }
    getTableClasses() {
        return [
            require('../user/user.table').UserTable,
            require('../content/content.table').ContentTable,
            require('../content/content_revision.table').ContentRevisionTable,
            // require('../config/config.database').ConfigDatabase,
        ];
    }

    async configure(config=null) {
        if(config && typeof config.database === 'object') {
            Object.assign(this.dbConfig, config.database);
            await this.createConnection(this.dbConfig);
        } else {
            const localConfig = new LocalConfig();
            const dbConfig = await localConfig.getOrCreate('database');
            Object.assign(this.dbConfig, dbConfig);
            Object.assign(dbConfig, this.dbConfig);
            await this.createConnection(this.dbConfig);
            await localConfig.saveAll();
        }


        const defaultHostname     = (require('os').hostname()).toLowerCase();
        await this.configureDatabase(this.primaryDatabase, defaultHostname);
    }

    async configureInteractive() {
        if(this.db) {
            console.warn("Closing existing DB Connection");
            this.db.end();
        }


        const localConfig = new LocalConfig();
        let dbConfig = await localConfig.getOrCreate('database');
        Object.assign(dbConfig, this.dbConfig);
        const interactiveConfig = new InteractiveConfig(dbConfig);

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


        await this.configure();

    }



    async configureDatabase(database, hostname, interactive=false) {
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
        const tableClasses = this.getTableClasses();

        for(let i=0; i<tableClasses.length; i++) {
            const table = new tableClasses[i](database);
            await table.configure(hostname);
            if(interactive)
                await table.configureInteractive();
        }

        if(this.isMultipleDomainMode()) {
            // Configure Domain
            const domainTable = this.getPrimaryDomainTable();
            if (this.primaryDatabase === database)
                await domainTable.configure();
            const domain = await domainTable.fetchDomainByHostname(hostname);
            if (!domain) {
                await domainTable.insertDomain(hostname, database);
                console.log(`Created domain entry: ${hostname} => ${database}`);
            } else {
                if (!domain.database) {
                    await domainTable.updateDomain(hostname, database);
                    console.info(`Updated domain entry: ${hostname} => ${database}`);

                } else {
                    console.info(`Found domain entry: ${hostname} => ${database}`);
                }
            }
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
    //     const interactiveConfig = new InteractiveConfig();
    //     if(!interactiveConfig.has('database'))
    //         throw new Error("Database not configured");
    //     const dbConfig = await interactiveConfig.getOrCreate('database');
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
    //     const databaseConfig = await interactiveConfig.getOrCreate('database');
    //     Object.assign(dbConfig, databaseConfig);
    //     await interactiveConfig.saveAll();
    //     this.db = db;
    //     return db;
    // }

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

            const domainTable = this.getPrimaryDomainTable();
            const domain = await domainTable.fetchDomainByHostname(hostname);
            let database = null;
            if(domain) {
                database = domain.database;
            } else {
                await domainTable.insertDomain(hostname, null);
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
        if(this.db)
            throw new Error("Database connection already exists");
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
                    resolve(this.db);
                }
            });
        });
    }


    // async configureTable(tableName, tableSQL) {
    //     // Check for table
    //     try {
    //         await this.queryAsync(`SHOW COLUMNS FROM ${tableName}`);
    //     } catch (e) {
    //         if(e.code === 'ER_NO_SUCH_TABLE') {
    //             await this.queryAsync(tableSQL);
    //             await this.queryAsync(`SHOW COLUMNS FROM ${tableName}`);
    //             console.info(`Inserted table: ${tableName}`)
    //         } else {
    //             throw e;
    //         }
    //     }
    // }

    async queryAsync(sql, values) {
        // const db = this.get();
        if(!this.db)
            throw new Error("Database is not connected");
        if(this.db.state === 'disconnected') {
            this.db = null;
            await this.createConnection();
        }
        // await this.configure();
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

exports.DatabaseManager = new DatabaseManager();