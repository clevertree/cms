// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
// const { ArticleDatabase } = require('../../article/article.database');
const { UserAPI } = require('../../user/user.api');
const { DatabaseManager } = require('../../database/database.manager');

const TEMPLATE_DIR = path.resolve(__dirname);
const BASE_DIR = path.resolve((path.dirname(path.dirname(__dirname))));

class DefaultTheme {
    constructor() {
        this.menuData = null;
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


        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const articleDB = await DatabaseManager.getArticleDB(database);
        const configDB = await DatabaseManager.getConfigDB(database);


        await UserAPI.appendSessionHTML(req, article);

        const renderData = {article};


        // Menu data
        renderData.menu = await articleDB.queryMenuData(req, true);

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
                path: `/:user/${req.session.userID}`,
                title: 'My Profile',
            },{
                path: `/:user/${req.session.userID}/:edit`,
                title: 'Edit Profile',
            },{
                path: `/:user/:logout`,
                title: 'Log Out',
            }, "<hr/>", {
                path: '/:user',
                title: 'Browse Users'
            }, {
                path: '/:article',
                title: 'Browse Articles'
            }, {
                path: '/:config',
                title: 'Configure Site'
            });
        }


        // Server data
        renderData.site = await configDB.fetchConfigValues('site');

        // Relative path to root
        const slashCount = req.path.split('/').length-1;
        renderData.baseHRef = slashCount > 1 ? "../".repeat(slashCount-1) : null;

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