const fs = require('fs');
const path = require('path');
const express = require('express');

const { ConfigManager } = require('../config/config.manager');
const { DatabaseManager } = require('../database/database.manager');
const { UserAPI } = require('../user/user.api');
const { ArticleAPI } = require('../article/article.api');
const { FileAPI } = require('../file/file.api');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class APIManager {
    constructor() {
        this.router = null;
    }

    async configure(prompt=true) {
        // Init Database
        await DatabaseManager.configure(prompt);
        await UserAPI.configure(prompt);
        await ArticleAPI.configure(prompt);
        await FileAPI.configure(prompt);
        const router = express.Router();
        // router.use(cookieParser());
        // this.config.session.cookieName = 'session';
        // router.use(session(serverConfig.session));


        // Routes
        // new UserSessionManager(this).loadRoutes(this.express);
        router.use(UserAPI.getMiddleware());
        router.use(ArticleAPI.getMiddleware());
        router.use(FileAPI.getMiddleware());

        // CMS Asset files
        router.use(express.static(BASE_DIR));
        this.router = router;
    }

    getMiddleware() {
        if(!this.router)
            this.configure(false);

        return (req, res, next) => {
            return this.router(req, res, next);
        }
    }

    async listen() {
        const serverConfig = await ConfigManager.getOrCreate('server');
        // hostname = (hostname || require('os').hostname()).toLowerCase();
        // if(typeof serverConfig.session === 'undefined') {
        //     serverConfig.session = {};
        // }

        if(typeof serverConfig.port === 'undefined') {
            serverConfig.port = (await ConfigManager.prompt(`Please enter the Server Port`, serverConfig.port || 8080));
        }


        const express = express();
        express.use(this.middleware);

        // HTTP
        const ports = Array.isArray(serverConfig.port) ? serverConfig.port : [serverConfig.port];
        for(let i=0; i<ports.length; i++) {
            express.listen(ports[i]);
            console.log(`Listening on ${ports[i]}`);
        }
        return express;
    }


}

exports.APIServer = new APIManager();
