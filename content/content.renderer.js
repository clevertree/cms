const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const beautify_html = require('js-beautify').html;

class ContentRenderer {
    get DatabaseManager() { return require('../database/database.manager').DatabaseManager; }
    get ContentTable() { return require('../content/content.table').ContentTable; }
    constructor() {
    }

    // TODO: move to content renderer
    async render(req, content) {

        if(typeof content === "string")
            content = {data: content};

        content = Object.assign({}, {
            id: null,
            // path: null,
            title: require('os').hostname(),
            data: null,
            baseURL: '/',
            keywords: null,
            // htmlMenu: null,
            // htmlSession: await this.UserAPI.getSessionHTML(req),
        }, content);

        let html = content.data;

        let contentTable = null;
        if(this.DatabaseManager.isAvailable) {
            const database = await this.DatabaseManager.selectDatabaseByRequest(req, false);
            if (database) {
                contentTable = new this.ContentTable(database);
            }
        }

        const firstTag = html.match(/<(\w+)/)[1].toLowerCase();
        if(firstTag !== 'html') {
            if (firstTag !== 'body') {
                const templateHTML = await contentTable.fetchContentDataByPath('/site/template.html', 'UTF8');
                html = templateHTML.replace(/<%-html%>/g, html);
            }
        }
        html = html.replace(/<%-title%>/g, content.title);
        html = html.replace(/<%-path%>/g, content.path);

        let DOM = cheerio.load(html);
        const head = DOM('head');

        let headElm = head.find('base');
        if(content.baseURL && headElm.length === 0)
            head.prepend(`<base href="${content.baseURL}" />`);

        headElm = head.find('title');
        if(content.title && headElm.length === 0)
            head.prepend(`<title>${content.title}</title>`);

        headElm = head.find('meta[name=keywords]');
        if(content.keywords && headElm.length === 0)
            head.append(`<meta name="keywords" CONTENT="${content.keywords}">`);

        headElm = head.find('meta[name="session:userID"]');
        if(req.session && req.session.userID && headElm.length === 0)
            head.append(`<meta name="session:userID" content="${req.session.userID}">`);

        headElm = head.find('meta[name="content:id"]');
        if(content && content.id && headElm.length === 0 )
            head.append(`<meta name="content:id" content="${content.id}">`);

        html = DOM.html(); // .window.document.documentElement.outerHTML;
        html = beautify_html(html, {
            "preserve-newlines": false
        });
        return html;

        // let prependHTML = await UserAPI.getSessionHTML(req);
        // prependHTML += await TaskAPI.getSessionHTML(req);
    }

    async send(req, res, content) {
        return res.send(
            await this.render(req, content)
        );
    }

}
module.exports = {ContentRenderer: new ContentRenderer()};
