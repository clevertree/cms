// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const TEMPLATE_DIR = path.resolve(__dirname);
const BASE_DIR = path.resolve(path.dirname(path.dirname(path.dirname(__dirname))));

class MinimalTheme {
    constructor(app) {
        this.app = app;
        this.menuData = null;
        this.renderOptions = {
            views: [
                path.resolve(TEMPLATE_DIR + '/template/'),
                path.resolve(BASE_DIR + '/client/template/')
            ]
            // async: true
        };
    }

    async render(req, content, renderData) {
        const app = this.app;
        renderData.app = app;
        renderData.menu = await app.article.queryMenuData(false);
        renderData.req = req;
        renderData.content = await ejs.render(content, renderData, this.renderOptions);

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

    // TODO: allow rendering error pagesc
    // render(req, res) {
    //     this.queryArticleData(req, res, (error, renderData) => {
    //         if(error)
    //             return sendErr(res, error);
    //
    //         try {
    //             renderData.content = !renderData.article.content
    //                 ? "No Content"
    //                 : ejs.render(renderData.article.content, renderData, this.renderOptions);
    //         } catch (e) {
    //             console.error(e);
    //             renderData.content = e.message || e;
    //         }
    //
    //         const templatePath = path.resolve(TEMPLATE_DIR + '/template/default.ejs');
    //         ejs.renderFile(templatePath, renderData, this.renderOptions, (error, renderedTemplateHTML) => {
    //             if(error)
    //                 return sendErr(res, error);
    //             res.send(renderedTemplateHTML);
    //         });
    //     });
    // }

    // queryArticleData(req, res, callback) {
    //     const app = this.app;
    //     const renderPath = req.url;
    //     app.article.fetchArticleByPath(renderPath, (error, article) => {
    //         if(error)
    //             return callback(error);
    //         this.queryMenuData(false, (error, menu) => {
    //             if(error)
    //                 return callback(error);
    //             if(!article)
    //                 return callback("Path not found: " + renderPath);
    //             const renderData = {
    //                 app, req, article, menu
    //             };
    //             callback(null, renderData);
    //         });
    //     });
    //
    // }

    queryMenuData(force, callback) {
        if(!force && this.menuData && false)
            return callback(null, this.menuData);
        const app = this.app;
        app.article.queryMenuData((error, menuData) => {
            this.menuData = menuData;
            callback(error, this.menuData);
        })
    }

}

module.exports = MinimalTheme;

function sendErr(res, e) {
    console.error(e);
    res.send(e.message ? e.message + "<br/>\n" + JSON.stringify(e) : e);
}