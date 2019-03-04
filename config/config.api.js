const express = require('express');
const path = require('path');

const { HTTPServer } = require('../http/http.server');
const { DatabaseManager } = require('../database/database.manager');
const { ThemeAPI } = require('../theme/theme.api');
const { ConfigDatabase } = require("./config.database");
const { UserDatabase } = require("../user/user.database");
const { UserAPI } = require('../user/user.api');
const { SessionAPI } = require('../session/session.api');

const DIR_CONFIG = path.resolve(__dirname);

class ConfigAPI {
    constructor() {
    }


    getMiddleware() {
        // Configure Routes
        const router = express.Router();
        const bodyParser = require('body-parser');
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());
        router.use(SessionAPI.getMiddleware());

        // Handle Config requests
        router.get('/[:]config/[:]json',                    async (req, res) => await this.renderConfigJSON(req, res));
        router.all('/[:]config(/[:]edit)?',                 async (req, res) => await this.renderConfigEditor(req, res));

        // User Asset files
        router.get('/[:]config/[:]client/*',                async (req, res, next) => await this.handleConfigStaticFiles(req, res, next));


        return (req, res, next) => {
            if(!req.url.startsWith('/:config'))
                return next();
            return router(req, res, next);
        }
    }

    async handleConfigStaticFiles(req, res, next) {
        const routePrefix = '/:config/:client/';
        if(!req.url.startsWith(routePrefix))
            throw new Error("Invalid Route Prefix: " + req.url);
        const assetPath = req.url.substr(routePrefix.length);

        const staticFile = path.resolve(DIR_CONFIG + '/client/' + assetPath);
        HTTPServer.renderStaticFile(staticFile, req, res, next);
    }

    async renderConfigJSON(req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = new UserDatabase(database);
            const configDB = new ConfigDatabase(database);
            const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
            if(!sessionUser || !sessionUser.isAdmin())
                throw new Error("Not authorized");

            // Handle POST
            const configList = await configDB.selectAllConfigValues();
            const configValues = configDB.parseConfigValues(configList);

            return res.json({
                message: `${configList.length} Config${configList.length !== 1 ? 's' : ''} queried successfully`,
                config: configValues,
                configList,
            });
        } catch (error) {
            await this.renderError(error, req, res, true);
        }
    }

    async renderConfigEditor(req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = new UserDatabase(database);
            const configDB = new ConfigDatabase(database);
            const configList = await configDB.selectAllConfigValues();
            const configValues = configDB.parseConfigValues(configList);

            const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;

            switch(req.method) {
                case 'GET':
                    await ThemeAPI.send(req, res,
`<section>
    <script src="/:config/:client/config-editor.element.js"></script>
    <config-editor></config-editor>
</section>`);
                    break;

                default:
                case 'OPTIONS':

                    return res.json({
                        message: `${configList.length} Config${configList.length !== 1 ? 's' : ''} queried successfully`,
                        editable: !!sessionUser && sessionUser.isAdmin(),
                        config: configValues,
                        configList,
                    });

                case 'POST':
                    if(!sessionUser || !sessionUser.isAdmin())
                        throw new Error("Not authorized");

                    // Handle POST
                    const database = await DatabaseManager.selectDatabaseByRequest(req);
                    const configDB = new ConfigDatabase(database);
                    let affectedRows = 0;
                    for(let i=0; i<configList.length; i++) {
                        const configName = configList[i].name;
                        if(typeof req.body[configName] !== 'undefined' && req.body[configName] !== configList[i].value) {
                            affectedRows += await configDB.updateConfigValue(configName, req.body[configName])
                        }
                    }

                    return res.json({
                        message: `<div class='success'>${affectedRows.length} config setting${affectedRows.length !== 1 ? 's' : ''} updated successfully</div>`,
                        affectedRows,
                        configList
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }


    async renderError(error, req, res, json=null) {
        console.error(`${req.method} ${req.url} ${error.message}`);
        res.status(400);
        if(error.redirect) {
            res.redirect(error.redirect);
        } else if(req.method === 'GET' && !json) {
            await ThemeAPI.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
        } else {
            res.json(Object.assign({}, {
                message: `${req.method} ${req.url} ${error.message}`,
                error: error.stack,
                code: error.code,
            }, json));
        }
    }
}


module.exports = {ConfigAPI: new ConfigAPI()};

