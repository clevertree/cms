// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { ArticleDatabase } = require('../../article/article.database');
const { UserSession } = require('../../user/usersession.class');
const { DatabaseManager } = require('../../database/database.manager');

const TEMPLATE_DIR = path.resolve(__dirname);
const BASE_DIR = path.resolve(path.dirname(path.dirname(path.dirname(__dirname))));

class DefaultTheme {
    constructor() {
        this.menuData = null;
        this.renderOptions = {
            views: [
                path.resolve(TEMPLATE_DIR),
                path.resolve(BASE_DIR + '/app/')
            ]
            // async: true
        };
    }

    async getArticleDB(req=null) {
        const host = req ? req.headers.host.split(':')[0] : null;
        return new ArticleDatabase(await DatabaseManager.get(host));
    }

    async render(req, content, renderData) {
        try {
            const articleDB = await this.getArticleDB(req);

            if (!renderData)
                renderData = {};
            renderData.baseHRef = this.getBaseHRef(req);
            renderData.menu = await articleDB.queryMenuData(true);
            renderData.userSession = new UserSession(req.session);
            renderData.sessionUser = await renderData.userSession.getSessionUser(articleDB.db);
            renderData.req = req;
            renderData.content = content ? await ejs.render(content, renderData, this.renderOptions) : null;
            renderData.hostname = require('os').hostname();


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