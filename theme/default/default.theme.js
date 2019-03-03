// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
// const { ContentDatabase } = require('../../content/content.database');
const { UserAPI } = require('../../user/user.api');
const { ContentDatabase } = require('../../content/content.database');
const { DatabaseManager } = require('../../database/database.manager');
const { TaskAPI } = require('../../task/task.api');
const { ConfigDatabase } = require("../../config/config.database");
const { AbstractTheme } = require("../../theme/theme.api");

const DIR_TEMPLATE = path.resolve(__dirname + '/template');
const DIR_CLIENT_ASSETS = path.resolve(__dirname + '/client');
// const BASE_DIR = path.resolve((path.dirname(path.dirname(__dirname))));

class DefaultTheme {
    constructor() {
    }

    getThemeAssetsDirectory() {
        return DIR_CLIENT_ASSETS;
    }

    async render(req, content) {
        if(typeof content === "string")
            content = {data: content};

        // const configDB = new ConfigDatabase(database);

        // const activeTaskIDs = await TaskAPI.getActiveTaskIDs(req);

        let prependHTML = await UserAPI.getSessionHTML(req);
        // prependHTML += await TaskAPI.getSessionHTML(req);
        if(prependHTML)
            content.data = prependHTML + content.data;

        // Relative path to root
        // const slashCount = req.path.split('/').length-1;
        // renderData.baseHRef = slashCount > 1 ? "../".repeat(slashCount-1) : null;
        const renderData = {
            content,
            site: {}
        };


        // Menu data
        renderData.menu = [];
        renderData.site = {baseURL: '/'};
        if(DatabaseManager.isAvailable) {
            const database = await DatabaseManager.selectDatabaseByRequest(req, false);
            if(database) {
                const contentDB = new ContentDatabase(database);
                renderData.menu = await contentDB.queryMenuData(req, true);

                const configDB = new ConfigDatabase(database);
                const configList = await configDB.selectAllConfigValues();
                const configValues = configDB.parseConfigValues(configList);
                renderData.site = configValues.site; // TODO: select only site.* values;

                const fetchContent = async (path) => {
                    const content = await contentDB.fetchContentByPath(path);
                    if(!content)
                        throw new Error("Theme content not available: " + path);
                    return content.data;
                };
                // content.themeHeader = 'omg';
                if(renderData.site.themeHeader)
                    content.themeHeader = await fetchContent(renderData.site.themeHeader);
                if(renderData.site.themeFooter)
                    content.themeFooter = await fetchContent(renderData.site.themeFooter);
                if(renderData.site.themeMenu)
                    content.themeMenu = await fetchContent(renderData.site.themeMenu);
            }
        }

        if(!req.session || !req.session.userID) { // If not logged in
            renderData.menu.push({
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
            renderData.menu.push({
                path: `/:user/${req.session.userID}`,
                title: 'Menu',
                subMenu: submenu
            });
            if(content.id) {
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
            },{
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
            },{
                path: `/:user/${req.session.userID}/:edit`,
                title: 'Edit Profile',
            },{
                path: `/:user/:logout`,
                title: 'Log Out',
            });
        }


        // Server data
        // renderData.site = await configDB.fetchConfigValues('site');


        try {
            const templatePath = path.resolve(DIR_TEMPLATE + '/theme.ejs');
            // res.render(templatePath)
            return await ejs.renderFile(templatePath, renderData, this.renderOptions);
        } catch (e) {
            console.error(e);
            return "Error Rendering Theme: " + e.stack;
        }
    }

}

module.exports = DefaultTheme;

// function sendErr(res, e) {
//     console.error(e);
//     res.send(e.message ? e.message + "<br/>\n" + JSON.stringify(e) : e);
// }