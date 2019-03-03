const fs = require('fs');
const {promisify} = require('util');
const path = require('path');


const { HTTPServer } = require('../http/http.server');
const { SessionAPI } = require('../session/session.api');

const THEME_DIR = path.resolve(__dirname);

class ThemeAPI {
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
        const bodyParser = require('body-parser');


        // API Routes
        const router = express.Router();
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());
        router.use(SessionAPI.getMiddleware());

        router.all('/[:]theme/:themeName(\\w+)',                        async (req, res, next) => await this.handleThemeRequest('edit', req.params.themeName, req, res, next));
        router.get('/[:]theme/:themeName(\\w+)/[:]client/*',  async (req, res, next) => await this.handleThemeStaticFiles(req.params.themeName, req, res, next));
        router.all('/[:]theme/([:]browse)?',                            async (req, res) => await this.handleBrowseRequest(req, res));


        return (req, res, next) => {
            if(!req.url.startsWith('/:theme'))
                return next();
            return router(req, res, next);
        }
    }

    async send(req, res, content) {
        return res.send(
            await this.render(req, content)
        );
    }

    async render(req, content) {
        const theme = this.get(content.theme || 'default');
        return await theme.render(req, content);
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
        HTTPServer.renderStaticFile(staticFile, req, res, next);

    }
}

// ThemeAPI.DEFAULT = {
//     debug: true,
// };

exports.ThemeAPI = new ThemeAPI();
