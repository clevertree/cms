const fs = require('fs');
const path = require('path');
const express = require('express');

const { LocalConfig } = require('../config/local.config');

const { DatabaseManager } = require('../database/database.manager');
const { UserAPI } = require('../user/user.api');
const { ArticleAPI } = require('../article/article.api');
const { FileAPI } = require('../file/file.api');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class APIServer {
    constructor() {
        this.router = null;
    }

    async configure(config=null) {
        const localConfig = new LocalConfig(config, !config);
        const serverConfig = await localConfig.getOrCreate('server');

        if(!serverConfig.port)  await localConfig.promptValue('server.port', `Please enter the Server Port`, 8080);

        await DatabaseManager.configure(config);
        await UserAPI.configure(config);
        await ArticleAPI.configure(config);
        await FileAPI.configure(config);

        const router = express.Router();
        // Routes
        router.use(UserAPI.getMiddleware());
        router.use(ArticleAPI.getMiddleware());
        router.use(FileAPI.getMiddleware());

        // CMS Asset files
        router.use(express.static(BASE_DIR));
        this.router = router;
        return serverConfig;
    }

    getMiddleware() {
        if(!this.router)
            this.configure();

        return (req, res, next) => {
            return this.router(req, res, next);
        }
    }

    async listen(ports=null) {
        const config = await this.configure();
        if(!ports)
            ports = config.port;
        const app = express();
        app.use(this.getMiddleware());

        // HTTP
        ports = Array.isArray(ports) ? ports : [ports];
        for(let i=0; i<ports.length; i++) try {
            app.listen(ports[i]);
            console.log(`Listening on ${ports[i]}`);
        } catch (e) {
            console.log(`Could not listen on ${ports[i]}: ${e.message}`);
        }
        return app;
    }
}

exports.APIServer = new APIServer();
