const fs = require('fs');
const path = require('path');
const express = require('express');

const { ConfigDatabase } = require('../config/config.database');

const { DatabaseManager } = require('../database/database.manager');
const { UserAPI } = require('../user/user.api');
const { ArticleAPI } = require('../article/article.api');
const { FileAPI } = require('../file/file.api');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class APIManager {
    constructor() {
        this.router = null;
    }

    async configure(configCallback=null) {
        // TODO: use local config with save and prompt vs memory config (no save, no prompt)
        if(!configCallback)
            configCallback = this.configPromptAndSave;
        if(typeof configCallback === "object")
            configCallback = this.configObject(configCallback);

        // let saveConfig = false;
        // if(!configCallback) {
        //     saveConfig = true;
        // }
        if(typeof configCallback.server === "undefined")      configCallback.server = {};
        if(typeof configCallback.server.port === "undefined") configCallback.server.port = 8080;
        if(typeof configCallback.database === "undefined")      configCallback.database = {};
        // Init Database

        // hostname = (hostname || require('os').hostname()).toLowerCase();
        // if(typeof globalConfig.server.session === 'undefined') {
        //     globalConfig.server.session = {};
        // }

        if(promptCallback) {
            configCallback.server.port = await promptCallback(`Please enter the Server Port`, configCallback.server.port);
            // globalConfig.server = await configDB.getConfigValues('server%');
        }
        if(saveConfig)
            LocalConfigManager.saveAll();


        await DatabaseManager.configure();
        await UserAPI.configure(interactive);
        await ArticleAPI.configure(interactive);
        await FileAPI.configure(interactive);

        const router = express.Router();
        // Routes
        router.use(UserAPI.getMiddleware());
        router.use(ArticleAPI.getMiddleware());
        router.use(FileAPI.getMiddleware());

        // CMS Asset files
        router.use(express.static(BASE_DIR));
        this.router = router;
        return configCallback;
    }

    getMiddleware() {
        if(!this.router)
            this.configure(false);

        return (req, res, next) => {
            return this.router(req, res, next);
        }
    }

    async listen(ports=null) {
        if(!ports)
            ports = (await LocalConfigManager.get('server')).port;
        const express = express();
        express.use(this.getMiddleware());

        // HTTP
        ports = Array.isArray(ports) ? ports : [ports];
        for(let i=0; i<ports.length; i++) try {
            express.listen(ports[i]);
            console.log(`Listening on ${ports[i]}`);
        } catch (e) {
            console.log(`Could not listen on ${ports[i]}: ${e.message}`);
        }
        return express;
    }

    async configObject(config) {
        return function(path, text, defaultValue) {

        }
    }

    async configPromptAndSave(path, text, defaultValue) {
        const globalConfig = await LocalConfigManager.getAll();

    }

    async prompt(text, defaultValue=null) {
        var standard_input = process.stdin;
        standard_input.setEncoding('utf-8');
        return new Promise( ( resolve, reject ) => {
            process.stdout.write(text + ` [${(defaultValue === null ? 'null' : defaultValue)}]: `);
            standard_input.on('data', function (data) {
                data = data.trim() || defaultValue;
                resolve (data);
            });
        });
    }
}

exports.APIServer = new APIManager();
