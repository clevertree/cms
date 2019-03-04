const fs = require('fs');
const {promisify} = require('util');
const path = require('path');


const { UserAPI } = require('../user/user.api');
const { ContentDatabase } = require('../content/content.database');
const { DatabaseManager } = require('../database/database.manager');
const { TaskAPI } = require('../task/task.api');
const { ConfigDatabase } = require("../config/config.database");
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

    async renderMenu(req, menu=[]) {

        if(!menu) {
            menu = [];
            if (!req.session || !req.session.userID) { // If not logged in
                menu.push({
                    path: '/:user/:login',
                    title: 'Log In',
                    subMenu: [{
                        path: '/:user/:register',
                        title: 'Register'
                    }, "<hr/>", {
                        path: '/:task',
                        title: `Browse Tasks`
                    }, "<hr/>", {
                        path: '/:content',
                        title: 'Browse Content'
                    }]
                })
            } else { // If Logged In
                const submenu = [];
                menu.push({
                    path: `/:user/${req.session.userID}`,
                    title: 'Menu',
                    subMenu: submenu
                });
                if (content.id) {
                    submenu.push({
                        path: `/:content/${content.id}/:edit`,
                        title: 'Edit This Page\'s Content',
                    });
                }
                submenu.push({
                    path: '/:content',
                    title: 'Site Index'
                }, "<hr/>", {
                    path: '/:task',
                    title: `Browse Tasks`
                }, {
                    path: '/:config',
                    title: 'Configure Site'
                }, "<hr/>", {
                    path: '/:file',
                    title: 'Browse Files'
                }, "<hr/>", {
                    path: '/:user',
                    title: 'Browse Users'
                }, {
                    path: `/:user/${req.session.userID}`,
                    title: 'My Profile',
                }, {
                    path: `/:user/${req.session.userID}/:edit`,
                    title: 'Edit Profile',
                }, {
                    path: `/:user/:logout`,
                    title: 'Log Out',
                });
            }
        }

        return `            
            <nav>
                <ul class="nav-menu">
                    ${menu.map(menuItem => `
                    <li>
                        <a href="${menuItem.path}">${menuItem.title}</a>
                        ${menuItem.subMenu && menuItem.subMenu.length === 0 ? `` : `
                        <ul class="nav-submenu">
                            ${menuItem.subMenu.map(subMenuItem => {
                                if(typeof subMenuItem === "string") 
                                    return subMenuItem;
                            
                                return `<li><a href="${subMenuItem.path}">${subMenuItem.title}</a></li>`;
                            }).join('')}
                        </ul>
                        `}
                    </li>
                    `).join('')}
                </ul>
            </nav>
`
    }
    
    async render(req, content) {
        if(typeof content === "string")
            content = {data: content};
        content = Object.assign({}, content, {
            title: require('os').hostname(),
            data: null,
            baseURL: '/',
            htmlHeader: null,
            htmlFooter: null,
            htmlMenu: null,
            htmlSession: await UserAPI.getSessionHTML(req),

        });

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
        if(DatabaseManager.isAvailable) {
            const database = await DatabaseManager.selectDatabaseByRequest(req, false);
            if(database) {
                // const contentDB = new ContentDatabase(database);
                // renderData.menu = await contentDB.queryMenuData(req, true);

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
        HTTPServer.renderStaticFile(staticFile, req, res, next);

    }
}

// ThemeAPI.DEFAULT = {
//     debug: true,
// };

exports.ThemeAPI = new ThemeAPI();
