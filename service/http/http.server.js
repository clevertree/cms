const fs = require('fs');
const path = require('path');
const express = require('express');
var qs = require('qs');
var parseUrl = require('parseurl');

const { LocalConfig } = require('../../config/local.config');
// const { ConfigManager } = require('../../config/config.manager');

// const { TaskAPI } = require('../task/task.manager');
const { DatabaseManager } = require('../../database/database.manager');
const { DatabaseAPI } = require('../../database/database.api');
const { UserAPI } = require('../../user/user.api');
const { ArticleAPI } = require('../../article/article.api');
const { FileAPI } = require('../file/file.api');
const { ConfigAPI } = require('../../config/config.api');
const { TaskAPI } = require('../task/task.api');

const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));

class HTTPServer {
    constructor() {
        this.app = null;
        this.config = null;
    }

    async configure(promptCallback=null) {

        // if(this.config)
        //     return this.config;

        // const localConfig = new LocalConfig(config, !config);
        // const serverConfig = await localConfig.getOrCreate('server');

        const localConfig = new LocalConfig(promptCallback);
        // const dbConfig = await localConfig.getOrCreate('database');
        const serverConfig = await localConfig.getOrCreate('server');
        // const defaultHostname     = (require('os').hostname()).toLowerCase();

        if(promptCallback) {
            await localConfig.promptValue('server.ssl', `Enable SSL Server with GreenLock [y or n]?`, serverConfig.ssl || false, 'boolean');
            if(!serverConfig.ssl)
                await localConfig.promptValue('server.port', `Please enter the Server HTTP Port`, serverConfig.port || 8080, 'integer');
            await localConfig.saveAll();
        }

        if(serverConfig.ssl) {
            const { SSLServer } = require('./ssl.server');
            await SSLServer.configure(promptCallback);
        }
        return serverConfig;

        // Configure local
        // if(!serverConfig.hostname)                  await localConfig.promptValue('server.hostname', `Please enter the Server Hostname`, require('os').hostname());
        // if(!serverConfig.port)                      await localConfig.promptValue('server.port', `Please enter the Server Port`, serverConfig.ssl === 'y' ? 443 : 8080);
        // if(typeof serverConfig.ssl === "undefined") await localConfig.promptValue('server.ssl', `Enable SSL Server with GreenLock? [y or n]`, 'y');
        // this.config = serverConfig;
        // serverConfig.ssl = serverConfig.ssl && serverConfig.ssl === 'y';
        // localConfig.saveAll();

        // await DatabaseManager.configure();

        // Configure site
        // const configDB = new ConfigDatabase();
        // let siteConfig = await configDB.fetchConfigValues('site');

        // let hostname = serverConfig.hostname;
        // if(hostname) await configDB.updateConfigValue('site.hostname', hostname);
        // else hostname = await configDB.promptValue('site.hostname', `Please enter the Site Public Hostname`, hostname);
        // if(!siteConfig.name) {
        // TODO: server should already be running. ask on the site!
        // siteConfig.name = await configDB.promptValue('site.name', `Please enter the Website Name`, hostname);
        // siteConfig.contact = await configDB.promptValue('site.contact', `Please enter the Website Contact Email`, 'admin@' + hostname, 'email');
        // siteConfig.keywords = await configDB.promptValue('site.keywords', `Please enter the Website Keywords`, siteConfig.keywords);
        // }

        // await DatabaseManager.configure(ConfigManager);
    }


    getMiddleware() {
        const router = express.Router();
        // Routes
        router.use(DatabaseAPI.getMiddleware());
        router.use(UserAPI.getMiddleware());
        router.use(ArticleAPI.getMiddleware());
        router.use(FileAPI.getMiddleware());
        router.use(ConfigAPI.getMiddleware());
        router.use(TaskAPI.getMiddleware());


        // CMS Asset files
        router.use(express.static(BASE_DIR));

        return (req, res, next) => {
            next = next || (() => { // If no next()
                console.error("Not Found: " + req.url);
                res.status(404);
                res.end("Not Found: " + req.url);
            });

            if (!req.query) {
                let  val = parseUrl(req).query || "";
                req.query = qs.parse(val); // opts
            }
            return router(req, res, next);
        };

        // return (req, res, next) => {
        //     try {
        //         if (!this.router)
        //             throw new Error("Router isn't configured");
        //
        //         var url = require('url');
        //         const query = url.parse(req.url).query;
        //         console.log(req, req.query, query);
        //         if (!req.query)
        //             req.query = query;
        //
        //         // next = next || function () { // If no next()
        //         //     console.error("No Next!");
        //         // };
        //         return this.router(req, res, next);
        //     } catch (err) {
        //         return res.send(err);
        //     }
        // }
    }

    async listen() {
        try {
            const serverConfig = await this.configure();
            // try {
            //     await DatabaseManager.configure();
            // } catch (e) {
            //     console.error("Database is not yet configured: ", e);
            // }


            if(serverConfig.ssl) {
                const { SSLServer } = require('./ssl.server');
                await SSLServer.listen();
                return;
            }
            if (this.app)
                throw new Error("App already listening");

            this.app = express();
            this.app.use(this.getMiddleware());

            // HTTP
            this.app.listen(serverConfig.port);
            console.log(`Listening on ${serverConfig.port}`);
            return this.app;
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }
}

exports.HTTPServer = new HTTPServer();
