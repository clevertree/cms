// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { ArticleDatabase } = require('../../../server/article/articledatabase');

const TEMPLATE_DIR = path.resolve(__dirname);
const BASE_DIR = path.resolve(path.dirname(path.dirname(path.dirname(__dirname))));

class MinimalTheme {
    constructor(app) {
        this.app = app;
        this.menuData = null;
        this.renderOptions = {
            views: [
                path.resolve(TEMPLATE_DIR + '/template/'),
                path.resolve(BASE_DIR + '/server/template/')
            ]
            // async: true
        };
    }
    get articleDB() { return new ArticleDatabase(this.app.db); }

    async render(req, content, renderData) {
        const app = this.app;
        if(!renderData)
            renderData = {};
        renderData.app = app;
        renderData.menu = await this.articleDB.queryMenuData(false);
        renderData.req = req;
        renderData.content = content ? await ejs.render(content, renderData, this.renderOptions) : "No Content";

        req.baseHref = this.getBaseHRef(req);

        const templatePath = path.resolve(TEMPLATE_DIR + '/template/default.ejs');
        return await ejs.renderFile(templatePath, renderData, this.renderOptions);
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