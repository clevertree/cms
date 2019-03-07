const fs = require('fs');
const {promisify} = require('util');
const path = require('path');

const { ConfigDatabase } = require("../config/config.database");
const { ContentTable } = require("../content/content.table");

const THEME_DIR = path.resolve(__dirname);

class ThemeAPI {
    get UserAPI() { return require('../user/user.api').UserAPI; }
    get DatabaseManager() { return require('../database/database.manager').DatabaseManager; }
    get ContentAPI() { return require('../content/content.api').ContentAPI; }
    get ContentTable() { return require('../content/content.table').ContentTable; }
    get SessionAPI() { return require('../user/session/session.api').SessionAPI; }

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


    // TODO: move to content renderer
    async render(req, content) {
        if(typeof content === "string")
            content = {data: content};
        let output = content.data;

        let contentTable = null;
        if(this.DatabaseManager.isAvailable) {
            const database = await this.DatabaseManager.selectDatabaseByRequest(req, false);
            if (database) {
                contentTable = new ContentTable(database);
            }
        }

        content = Object.assign({}, {
            id: null,
            path: null,
            title: require('os').hostname(),
            data: null,
            baseURL: '/',
            keywords: null,
            head: null,
            header: null,
            footer: null,
            // htmlMenu: null,
            // htmlSession: await this.UserAPI.getSessionHTML(req),

        }, content);



        const firstTag = output.match(/<(\w+)/)[1].toLowerCase();
        if(firstTag === 'html')
            return output;

        if(!content.header && contentTable)
            content.header = await contentTable.fetchContentDataByPath('/theme/header');

        if(!content.footer && contentTable)
            content.footer = await contentTable.fetchContentDataByPath('/theme/footer');

        if(firstTag !== 'body') {
            if(firstTag !== 'article') {
                output =
`        <article>
${output}
        </article>`
            }
// TODO: detect theme from body?
            output = `    
    <body class='theme-default'>
${content.header||''}${output}${content.footer||''}
    </body>`

        }

        if(!content.head && contentTable)
            content.head = await contentTable.fetchContentByPath('/theme/head');

                output = `
<!DOCTYPE html>
<html>
    <head>
        <base href="${content.baseUrl}">
        <title>${content.title}</title>
        <meta http-equiv="content-type" content="text/html; charset=utf-8" />
        <meta name="keywords" CONTENT="${content.keywords}">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${req.session && req.session.userID ? `<meta name="userID" content="${req.session.userID}">` : ''}
        ${content && content.id ? `<meta name="contentID" content="${content.id}">` : ''}

        <link href=":theme/default/:client/default.theme.css" rel="stylesheet" />
        <script src=":theme/default/:client/element/theme-default-nav-menu.element.js"></script>
        ${content.head}
    </head>
${output}
</html>`;

        return output;

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
        // if(!content.menu)
        //     content.menu = await this.renderMenu(req);
        // const theme = this.get(content.theme || 'default');
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
        await this.ContentAPI.renderStaticFile(req, res, next, staticFile);

    }
}

// ThemeAPI.DEFAULT = {
//     debug: true,
// };

exports.ThemeAPI = new ThemeAPI();
