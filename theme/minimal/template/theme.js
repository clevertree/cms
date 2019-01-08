// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const BASE_DIR = path.resolve(path.dirname(path.dirname(path.dirname(__dirname))));

class MinimalTheme {
    constructor(app) {
        this.app = app;
        this.menuData = null;
        this.renderOptions = {
            views: [BASE_DIR]
            // async: true
        };
    }


    render(req, res) {
        this.queryArticleData(req, res, (error, renderData) => {
            if(error)
                return sendErr(res, error);

            try {
                renderData.content = ejs.render(renderData.article.content, renderData, this.renderOptions);
            } catch (e) {
                renderData.content = e.message || e;
            }

            const templatePath = path.resolve(BASE_DIR + '/theme/minimal/template/default.ejs');
            ejs.renderFile(templatePath, renderData, this.renderOptions, (error, renderedTemplateHTML) => {
                if(error)
                    return sendErr(res, error);
                res.send(renderedTemplateHTML);
            });
        });
    }

    renderTemplate(renderData, callback) {
        const templatePath = path.resolve(BASE_DIR + '/theme/minimal/template/default.ejs');
        ejs.renderFile(templatePath, renderData, this.renderOptions, callback);
    }

    queryArticleData(req, res, callback) {
        const app = this.app;
        const renderPath = req.url;
        app.view.getArticleByPath(renderPath, (error, article) => {
            this.queryMenuData(false, (error, menu) => {
                app.user.getSessionUser(req, (sessionUser) => {
                    if(error)
                        return callback(error);
                    if(!article)
                        return callback("Path not found: " + renderPath);
                    const renderData = {
                        app, req, article, menu, sessionUser
                    };
                    callback(null, renderData);
                });
            });
        });

    }

    queryMenuData(force, callback) {
        if(!force && this.menuData)
            return callback(null, this.menuData);
        const app = this.app;
        app.view.queryMenuData((error, menuData) => {
            this.menuData = menuData;
            callback(null, this.menuData);
        })
    }

}

module.exports = MinimalTheme;

function sendErr(res, e) {
    console.error(e);
    res.send(e);
}