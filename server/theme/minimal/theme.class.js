// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { ArticleDatabase } = require('../../article/articledatabase');
const { UserSession } = require('../../user/usersession.class');

const TEMPLATE_DIR = path.resolve(__dirname);
const BASE_DIR = path.resolve(path.dirname(path.dirname(path.dirname(__dirname))));

class MinimalTheme {
    constructor(app) {
        this.app = app;
        this.menuData = null;
        this.renderOptions = {
            views: [
                path.resolve(TEMPLATE_DIR),
                path.resolve(BASE_DIR + '/server/')
            ]
            // async: true
        };
    }
    get articleDB() { return new ArticleDatabase(this.app.db); }

    async render(req, content, renderData) {
        try {
            const app = this.app;
            if (!renderData)
                renderData = {};
            renderData.app = app;
            renderData.menu = await this.articleDB.queryMenuData(true);
            renderData.sessionUser = await new UserSession(req.session).getSessionUser(this.app.db);
            renderData.req = req;
            renderData.content = content ? await ejs.render(content, renderData, this.renderOptions) : null;

            req.baseHref = this.getBaseHRef(req);

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

module.exports = MinimalTheme;

function sendErr(res, e) {
    console.error(e);
    res.send(e.message ? e.message + "<br/>\n" + JSON.stringify(e) : e);
}