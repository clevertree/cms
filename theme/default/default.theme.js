// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
// const { ArticleDatabase } = require('../../article/article.database');
// const { UserDatabase } = require('../../user/user.database');
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

    async render(req, content, renderData) {
        try {
            const articleDB = await DatabaseManager.getArticleDB(req);
            const userDB = await DatabaseManager.getUserDB(req);

            if (!renderData)
                renderData = {};
            renderData.baseHRef = this.getBaseHRef(req);
            renderData.menu = await articleDB.queryMenuData(true);

            // const sessionUser = await userDB.fetchUserByID(req.session.userID);
            renderData.sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
            renderData.req = req;
            renderData.hostname = require('os').hostname();
            renderData.content = content ? await ejs.render(content, renderData, this.renderOptions) : null;

            const templatePath = path.resolve(TEMPLATE_DIR + '/theme.ejs');
            return await ejs.renderFile(templatePath, renderData, this.renderOptions);
        } catch (e) {
            console.error(e);
            return "Error Rendering Theme: " + e.stack;
        }
    }


    getBaseHRef(req) {
        const slashCount = req.path.split('/').length-1;
        if(slashCount <= 1)
            return null;
        return "../".repeat(slashCount-1);
    }


}

module.exports = DefaultTheme;

function sendErr(res, e) {
    console.error(e);
    res.send(e.message ? e.message + "<br/>\n" + JSON.stringify(e) : e);
}