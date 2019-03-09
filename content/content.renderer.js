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
                html = templateHTML.replace(/<%-data%>/g, html);
            }
        }
        html = html.replace(/<%-title%>/g, content.title);
        html = html.replace(/<%-path%>/g, content.path);

        let DOM = cheerio.load(html);

        // TODO: optimize find custom elements
        const customElms = [];
        DOM('*').each((i, elm) => {
            if(elm.name.indexOf('-') === -1)
                return;
            customElms.push(elm.name);
        });


        // TODO: optimize DOM manipulation
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

        for(let i=0; i<customElms.length; i++) {
            const customElementSourceFile = this.getCustomElementSourceFile(customElms[i]);
            head.append(`<script src="${customElementSourceFile}" ></script>`);
        }

        html = DOM.html(); // .window.document.documentElement.outerHTML;
        html = beautify_html(html, {
            "preserve-newlines": false
        });
        return html;

        // let prependHTML = await UserAPI.getSessionHTML(req);
        // prependHTML += await TaskAPI.getSessionHTML(req);
    }

    getCustomElementSourceFile(customName) {
        if(typeof CUSTOM_ELEMENT_SOURCE[customName] !== "undefined")
            return CUSTOM_ELEMENT_SOURCE[customName];
        const prefix = customName.split('-')[0];
        return `/:${prefix}/:client/${customName}.element.js`;

    }

    async send(req, res, content) {
        return res.send(
            await this.render(req, content)
        );
    }

}
module.exports = {ContentRenderer: new ContentRenderer()};

const CUSTOM_ELEMENT_SOURCE = {
    // 'config-editor':        '/:config/:client/config-editor.element.js',
    //
    // 'content-add':          '/:content/:client/content-add.element.js',
    // 'content-browser':      '/:content/:client/content-browser.element.js',
    // 'content-delete':       '/:content/:client/content-delete.element.js',
    // 'content-editor':       '/:content/:client/content-editor.element.js',
    // 'content-nav':          '/:content/:client/content-nav.element.js',
    // 'content-upload':       '/:content/:client/content-upload.element.js',
    //
    // // 'editor': 'databaseform-connect.client.js',
    // // 'editor': 'databaseform-manage.client.js',
    //
    // 'slideshow-player':     '/:content/:client/slideshow-player.element.js',
    //
    // 'task-manager':         '/:task/:client/task-manager.element.js',
    //
    // 'user-browser':         '/:user/:client/user-browser.element.js',
    // 'user-forgotpassword':  '/:user/:client/user-forgotpassword.element.js',
    // 'user-login':           '/:user/:client/user-login.element.js',
    // 'user-logout':          '/:user/:client/user-logout.element.js',
    // 'user-profile':         '/:user/:client/user-profile.element.js',
    // 'user-register':        '/:user/:client/user-register.element.js',
    // 'user-resetpassword':   '/:user/:client/user-resetpassword.element.js',
    // 'user-updateflags':     '/:user/:client/user-updateflags.element.js',
    // 'user-updatepassword':  '/:user/:client/user-updatepassword.element.js',
    // 'user-updateprofile':   '/:user/:client/user-updateprofile.element.js',
};