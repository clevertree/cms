// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
// const { ArticleDatabase } = require('../../article/article.database');
const { UserAPI } = require('../../user/user.api');
const { ArticleDatabase } = require('../../article/article.database');
const { DatabaseManager } = require('../../database/database.manager');
const { TaskAPI } = require('../../service/task/task.api');
const { ConfigDatabase } = require("../../config/config.database");

const TEMPLATE_DIR = path.resolve(__dirname + '/template');
const BASE_DIR = path.resolve((path.dirname(path.dirname(__dirname))));

class DefaultTheme {
    constructor() {
        this.renderOptions = {
            views: [
                path.resolve(TEMPLATE_DIR),
                path.resolve(BASE_DIR)
            ]
            // async: true
        };
    }


    async render(req, article) {
        if(typeof article === "string")
            article = {content: article};

        // const configDB = new ConfigDatabase(database);

        const activeTaskIDs = await TaskAPI.getActiveTaskIDs(req);

        let prependHTML = await UserAPI.getSessionHTML(req);
        // prependHTML += await TaskAPI.getSessionHTML(req);
        if(prependHTML)
            article.content = prependHTML + article.content;

        // Relative path to root
        // const slashCount = req.path.split('/').length-1;
        // renderData.baseHRef = slashCount > 1 ? "../".repeat(slashCount-1) : null;
        const renderData = {
            article,
            site: {}
        };


        // Menu data
        renderData.menu = [];
        if(DatabaseManager.isAvailable) {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const articleDB = new ArticleDatabase(database);
            renderData.menu = await articleDB.queryMenuData(req, true);

            const configDB = new ConfigDatabase(database);
            const configList = await configDB.selectAllConfigValues();
            const configValues = await configDB.parseConfigValues(configList);
            renderData.site = configValues.site; // TODO: cache site values per host;
        }

        if(!req.session || !req.session.userID) { // If not logged in
            renderData.menu.push({
                path: '/:user/:login',
                title: 'Log In',
                subMenu: [{
                    path: '/:user/:register',
                    title: 'Register'
                }, {
                    path: '/:article',
                    title: 'Browse Articles'
                }]
            })
        } else { // If Logged In
            const submenu = [];
            renderData.menu.push({
                path: `/:user/${req.session.userID}`,
                title: 'Menu',
                subMenu: submenu
            });
            if(article.id) {
                submenu.push({
                    path: `/:article/${article.id}/:edit`,
                    title: 'Edit This Article',
                });
            }
            submenu.push({
                path: '/:article',
                title: 'Browse Articles'
            }, "<hr/>", {
                path: '/:task',
                title: `${activeTaskIDs.length} Pending Task${activeTaskIDs.length > 1 ? 's' : ''}`
            },{
                path: '/:config',
                title: 'Configure Site'
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
            const templatePath = path.resolve(TEMPLATE_DIR + '/theme.ejs');
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