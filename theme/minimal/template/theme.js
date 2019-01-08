// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const BASE_DIR = path.resolve(path.dirname(path.dirname(path.dirname(__dirname))));

class MinimalTheme {
    constructor(app) {
        this.app = app;
    }


    render(req, res) {
        const app = this.app;
        const renderPath = req.url;
        app.view.getArticleByPath(renderPath, (error, article) => {
            app.user.getSessionUser(req, (sessionUser) => {
                if(error)
                    return sendErr(res, error);
                if(!article)
                    return sendErr(res, "Path not found: " + renderPath);
                const renderOptions = {
                    views: [BASE_DIR]
                };
                const renderData = {
                    app, req, sessionUser
                };

                renderData.renderContent = () => ejs.render(article.content, renderData, renderOptions);

                const templatePath = path.resolve(BASE_DIR + '/theme/minimal/template/default.ejs');
                ejs.renderFile(templatePath, renderData, renderOptions, (error, renderedTemplateHTML) => {
                    if(error)
                        return sendErr(res, error);
                    res.send(renderedTemplateHTML);
                });
            });
        });
    }

    getMenuArticles(callback) {
        const app = this.app;
        app.db.selectArticlesByFlag('main-menu,sub-menu', (error, articleList) => {

        })
    }

}

module.exports = MinimalTheme;

function sendErr(res, e) {
    console.error(e);
    res.send(e);
}