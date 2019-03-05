const fs = require('fs');
const {promisify} = require('util');
const path = require('path');


// const { UserTable } = require('../user/user.database');
// const { ContentTable } = require('../content/content.database');
// const { DatabaseManager } = require('../database/database.manager');
// const { TaskAPI } = require('../task/task.api');
const { ConfigDatabase } = require("../config/config.database");
// const { HTTPServer } = require('../http/http.server');
// const { SessionAPI } = require('../session/session.api');

const THEME_DIR = path.resolve(__dirname);

class ThemeAPI {
    get UserAPI() { return require('../user/user.api').UserAPI; }
    get DatabaseManager() { return require('../database/database.manager').DatabaseManager; }
    get HTTPServer() { return require('../http/http.server').HTTPServer; }
    get SessionAPI() { return require('../session/session.api').SessionAPI; }

    constructor() {
        this.themes = {};
    }

    async configure(promptCallback=null) {
        this.themes = {};
        const readdir = promisify(fs.readdir);
        const lstat = promisify(fs.lstat);
        const exists = promisify(fs.exists);

        // const themeList = [];
        const themeDirectories = await readdir(THEME_DIR);
        for(let i=0; i<themeDirectories.length; i++) {
            const themeName = themeDirectories[i];
            const themePath = path.resolve(THEME_DIR + '/' + themeName);
            const stats = await lstat(themePath);
            if(stats.isDirectory()) {
                const themeClassPath = path.resolve(themePath + '/' + themeName + '.theme.js');
                if(await exists(themeClassPath)) {
                    const themeClass = require(themeClassPath);
                    const themeInstance = new themeClass();
                    this.themes[themeName] = {
                        instance: themeInstance,
                        class: themeClass,
                        path: themePath
                    };
                } else {
                    throw new Error("Theme is missing theme file: " + themeClassPath);
                }
            }
        }
    }


    getMiddleware() {
        const express = require('express');


        // API Routes
        const router = express.Router();
        router.use(express.urlencoded({ extended: true }));
        router.use(express.json());
        router.use(this.SessionAPI.getMiddleware());

        router.all('/[:]theme/:themeName(\\w+)',                        async (req, res, next) => await this.handleThemeRequest('edit', req.params.themeName, req, res, next));
        router.get('/[:]theme/:themeName(\\w+)/[:]client/*',  async (req, res, next) => await this.handleThemeStaticFiles(req.params.themeName, req, res, next));
        router.all('/[:]theme/([:]browse)?',                            async (req, res) => await this.handleBrowseRequest(req, res));


        return (req, res, next) => {
            if(!req.url.startsWith('/:theme'))
                return next();
            return router(req, res, next);
        }
    }


    async render(req, content) {
        if(typeof content === "string")
            content = {data: content};
        content = Object.assign({}, {
            title: require('os').hostname(),
            data: null,
            baseURL: '/',
            keywords: null,
            session: req.session || {},
            htmlHeader: null,
            htmlFooter: null,
            htmlMenu: null,
            htmlSession: await this.UserAPI.getSessionHTML(req),

        }, content);

        // let prependHTML = await UserAPI.getSessionHTML(req);
        // prependHTML += await TaskAPI.getSessionHTML(req);

        // Relative path to root
        // const slashCount = req.path.split('/').length-1;
        // renderData.baseHRef = slashCount > 1 ? "../".repeat(slashCount-1) : null;
        // const renderData = {
        //     content,
        //     site: {}
        // };


        // Menu data
        // renderData.menu = [];
        if(this.DatabaseManager.isAvailable) {
            const database = await this.DatabaseManager.selectDatabaseByRequest(req, false);
            if(database) {
                // const contentDB = new ContentTable(database);
                // renderData.menu = await contentDB.queryMenuData(req, true);

                // if(req.session && req.session.userID ) {
                //     const userDB = new UserTable(database);
                //     content.sessionUser = userDB.fetchUserByID(req.session.userID);
                // }

                const configDB = new ConfigDatabase(database);
                const configList = await configDB.selectAllConfigValues();
                const configValues = configDB.parseConfigValues(configList);
                Object.keys(configValues.site).forEach(siteValueName => {
                    if(configValues.site[siteValueName] && typeof content[siteValueName] === 'undefined')
                        content[siteValueName] = configValues.site[siteValueName];
                });
            }
        }
        // if(!content.menu)
        //     content.menu = await this.renderMenu(req);


        const theme = this.get(content.theme || 'default');
        return await theme.render(req, content);
    }

    async send(req, res, content) {
        return res.send(
            await this.render(req, content)
        );
    }

    get(themeName='default') {
        if(typeof this.themes[themeName] !== 'undefined')
            return this.themes[themeName].instance;
        throw new Error("Theme not loaded: " + themeName);
    }

    // API Calls

    async handleThemeStaticFiles(themeName, req, res, next) {
        if(typeof this.themes[themeName] === 'undefined')
            return next();

        const routePrefix = '/:theme/' + themeName + '/:client/';
        if(!req.url.startsWith(routePrefix))
            throw new Error("Invalid Route Prefix: " + req.url);
        const assetPath = req.url.substr(routePrefix.length);

        const staticFile = path.resolve(this.themes[themeName].path + '/client/' + assetPath);
        this.HTTPServer.renderStaticFile(staticFile, req, res, next);

    }
}

// ThemeAPI.DEFAULT = {
//     debug: true,
// };

exports.ThemeAPI = new ThemeAPI();
