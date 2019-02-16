const fs = require('fs');
const path = require('path');
const express = require('express');

const { LocalConfig } = require('../../config/local.config');

// const { TaskManager } = require('../task/task.manager');
const { DatabaseManager } = require('../../database/database.manager');
const { UserAPI } = require('../../user/user.api');
const { ArticleAPI } = require('../../article/article.api');
const { FileAPI } = require('../file/file.api');
const { ConfigAPI } = require('../../config/config.api');
const { TaskAPI } = require('../task/task.api');

const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));

class HTTPServer {
    constructor() {
        this.router = null;
        this.config = null;
    }

    async configure(config=null) {
        if(this.config)
            return this.config;

        const localConfig = new LocalConfig(config, !config);
        const serverConfig = await localConfig.getOrCreate('server');

        // Configure local
        if(!serverConfig.hostname)                  await localConfig.promptValue('server.hostname', `Please enter the Server Hostname`, require('os').hostname());
        if(!serverConfig.port)                      await localConfig.promptValue('server.port', `Please enter the Server Port`, serverConfig.ssl === 'y' ? 443 : 8080);
        if(typeof serverConfig.ssl === "undefined") await localConfig.promptValue('server.ssl', `Enable SSL Server with GreenLock? [y or n]`, 'y');
        this.config = serverConfig;
        // serverConfig.ssl = serverConfig.ssl && serverConfig.ssl === 'y';
        // localConfig.saveAll();

        await DatabaseManager.configure(config);

        // Configure site
        const configDB = await DatabaseManager.getConfigDB();
        let siteConfig = await configDB.fetchConfigValues('site');

        let hostname = serverConfig.hostname;
        if(hostname) await configDB.updateConfigValue('site.hostname', hostname);
        else hostname = await configDB.promptValue('site.hostname', `Please enter the Site Public Hostname`, hostname);
        if(!siteConfig.name) {
            // TODO: server should already be running. ask on the site!
            siteConfig.name = await configDB.promptValue('site.name', `Please enter the Website Name`, hostname);
            siteConfig.contact = await configDB.promptValue('site.contact', `Please enter the Website Contact Email`, 'admin@' + hostname, 'email');
            siteConfig.keywords = await configDB.promptValue('site.keywords', `Please enter the Website Keywords`, siteConfig.keywords);
        }


        const router = express.Router();
        this.router = router;
        // Routes
        [
            UserAPI,
            ArticleAPI,
            FileAPI,
            ConfigAPI,
            TaskAPI
        ].forEach(async API => {
            await API.configure(config);
            router.use(API.getMiddleware());
        });


        // CMS Asset files
        router.use(express.static(BASE_DIR));




        return serverConfig;

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

    async listen(port=null) {
        const config = await this.configure();
        if(config.ssl === 'y') {
            const { SSLServer } = require('./ssl.server');
            await SSLServer.listen(port);
            return;
        }

        if(!port)
            port = config.port;
        const app = express();
        app.use(this.getMiddleware());

        // HTTP
        app.listen(port);
        console.log(`Listening on ${port}`);
        return app;
    }
}

exports.HTTPServer = new HTTPServer();
