const express = require('express');

const { DatabaseManager } = require('../database/database.manager');
const { ThemeManager } = require('../theme/theme.manager');
const { ConfigDatabase } = require("./config.database");
const { UserDatabase } = require("../user/user.database");
const { UserAPI } = require('../user/user.api');
const { SessionAPI } = require('../service/session/session.api');

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

        return (req, res, next) => {
            if(!req.url.startsWith('/:config'))
                return next();
            return router(req, res, next);
        }
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

            if (req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<section>
    <script src="/config/element/config-editorform.element.js"></script>
    <config-editorform></config-editorform>
</section>
`)
                );

            } else {
                // Handle POST
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = new UserDatabase(database);
                const configDB = new ConfigDatabase(database);

                const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
                if(!sessionUser || !sessionUser.isAdmin())
                    throw new Error("Not authorized");

                let configChanges = req.body, configUpdateList=[];
                for(let configName in configChanges) {
                    if(configChanges.hasOwnProperty(configName)) {
                        const configEntry = await configDB.fetchConfigValue(configName)
                        if(!configEntry)
                            throw new Error("Config entry not found: " + configName);
                        if(configChanges[configName] !== configEntry)
                            configUpdateList.push([configName, configChanges[configName]])
                    }
                }
                for(let i=0; i<configUpdateList.length; i++) {
                    await configDB.updateConfigValue(configUpdateList[i][0], configUpdateList[i][1])
                }


                const configList = await configDB.selectConfigValues('1');
                return res.json({
                    message: `<div class='success'>${configUpdateList.length} Config${configUpdateList.length !== 1 ? 's' : ''} updated successfully</div>`,
                    configList
                });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }


    async renderError(error, req, res, asJSON=false) {
        console.error(`${req.method} ${req.url}`, error);
        res.status(400);
        if(req.method === 'GET' && !asJSON) {          // Handle GET
            res.send(
                await ThemeManager.get()
                    .render(req, `<section class='error'><pre>${error.stack}</pre></section>`)
            );
        } else {
            res.json({message: error.stack});
        }
    }
}


module.exports = {ConfigAPI: new ConfigAPI()};

