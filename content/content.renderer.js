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
            head: null,
            header: null,
            footer: null,
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

            if (!content.header && contentTable)
                content.header = await contentTable.fetchContentDataByPath('/site/header', 'UTF8');

            if (!content.footer && contentTable)
                content.footer = await contentTable.fetchContentDataByPath('/site/footer', 'UTF8');

            if (firstTag !== 'body') {
                if (firstTag !== 'article') {
                    html =
                        `        <article>
${html}
        </article>`
                }
                html = `    
    <body class='themed'>
${content.header || ''}${html}${content.footer || ''}
    </body>`

            }

            if (!content.head && contentTable)
                content.head = await contentTable.fetchContentDataByPath('/site/head', 'UTF8');

            html = `<!DOCTYPE html>
<html>
${content.head || ''}
${html}
</html>`;
        }

//         `    <head>
//         <base href="${content.baseUrl}">
//         <title>${content.title}</title>
//         <meta http-equiv="content-type" content="text/html; charset=utf-8" />
//         <meta name="keywords" CONTENT="${content.keywords}">
//         <meta name="viewport" content="width=device-width, initial-scale=1">
//         ${req.session && req.session.userID ? `<meta name="userID" content="${req.session.userID}">` : ''}
//         ${content && content.id ? `<meta name="contentID" content="${content.id}">` : ''}
//
//         <link href=":theme/default/:client/default.theme.css" rel="stylesheet" />
//         <script src=":content/:client/content-nav.element.js"></script>
//         ${content.head}
//     </head>
// `
//         let DOM = new JSDOM(html);
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

        headElm = head.find('meta[name=userID]');
        if(req.session && req.session.userID && headElm.length === 0)
            head.append(`<meta name="userID" content="${req.session.userID}">`);

        headElm = head.find('meta[name=contentID]');
        if(content && content.id && headElm.length === 0 )
            head.append(`<meta name="contentID" content="${content.id}">`);

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
