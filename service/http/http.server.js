const fs = require('fs');
const path = require('path');
const express = require('express');

const { LocalConfig } = require('../../config/local.config');

// const { TaskManager } = require('../task/task.manager');
// const { DatabaseManager } = require('../../database/database.manager');
const { DatabaseAPI } = require('../../database/database.api');
const { UserAPI } = require('../../user/user.api');
const { ArticleAPI } = require('../../article/article.api');
const { FileAPI } = require('../file/file.api');
const { ConfigAPI } = require('../../config/config.api');
const { TaskAPI } = require('../task/task.api');

const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));

class HTTPServer {
    constructor() {
        this.router = null;
        // this.config = null;
        this.app = null;
    }

    async configure() {
        // if(this.config)
        //     return this.config;

        // const localConfig = new LocalConfig(config, !config);
        // const serverConfig = await localConfig.getOrCreate('server');

        // Configure local
        // if(!serverConfig.hostname)                  await localConfig.promptValue('server.hostname', `Please enter the Server Hostname`, require('os').hostname());
        // if(!serverConfig.port)                      await localConfig.promptValue('server.port', `Please enter the Server Port`, serverConfig.ssl === 'y' ? 443 : 8080);
        // if(typeof serverConfig.ssl === "undefined") await localConfig.promptValue('server.ssl', `Enable SSL Server with GreenLock? [y or n]`, 'y');
        // this.config = serverConfig;
        // serverConfig.ssl = serverConfig.ssl && serverConfig.ssl === 'y';
        // localConfig.saveAll();

        // await DatabaseManager.configure();

        // Configure site
        // const configDB = await DatabaseManager.getConfigDB();
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


        const router = express.Router();
        this.router = router;
        // Routes
        const routes = [
            DatabaseAPI,
            UserAPI,
            ArticleAPI,
            FileAPI,
            ConfigAPI,
            TaskAPI
        ];
        for(let i=0; i<routes.length; i++) {
            await routes[i].configure();
            router.use(routes[i].getMiddleware());
        }


        // CMS Asset files
        router.use(express.static(BASE_DIR));




        // return serverConfig;

    }


    getMiddleware() {
        if(!this.router)
            this.configure();
        return (req, res, next) => {
            next = next || (() => { // If no next()
                console.error("Not Found: " + req.url);
                res.status(404);
                res.end("Not Found: " + req.url);
            });
            return this.router(req, res, next);
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

    async listen(httpPort=8080, sslPort=8443) {
        // if(config.ssl === 'y') {
        //     const { SSLServer } = require('./ssl.server');
        //     await SSLServer.listen(httpPort);
        //     return;
        // }
        if(this.app)
            throw new Error("App already listening");

        this.app = express();
        this.app.use(this.getMiddleware());

        // HTTP
        this.app.listen(httpPort);
        console.log(`Listening on ${httpPort}`);
        return this.app;
    }
}

exports.HTTPServer = new HTTPServer();
