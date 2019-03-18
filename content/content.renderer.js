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

        const hostname = require('os').hostname();
        content = Object.assign({}, {
            id: null,
            // path: null,
            title: hostname,
            data: null,
            baseURL: '/',
            keywords: null,
            // htmlMenu: null,
            // htmlSession: await this.UserAPI.getSessionHTML(req),
        }, content);

        let html = content.data.toString('UTF8'); // This isn't inefficient, right?

        let contentTable = null;
        if(this.DatabaseManager.isAvailable) {
            const database = await this.DatabaseManager.selectDatabaseByRequest(req, false);
            if (database) {
                contentTable = new this.ContentTable(database);
            }
        }

        const firstTag = (html || '').match(/<(\w+)/)[1].toLowerCase();
        if(firstTag !== 'html') {
            if (firstTag !== 'body') { // TODO: finish body logic
                const templateHTML = await contentTable.fetchContentDataByPath('/site/template.html', 'UTF8');
                html = templateHTML.replace(/<%-data%>/g, html);
            }
        }
        html = html.replace(/<%-title%>/g, content.title);
        html = html.replace(/<%-path%>/g, content.path || req.url);
        // html = html.replace(/<%-hostname%>/g, hostname);

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
        const split = customName.split('-');
        return `/:${split[0]}/:client/${split[1]}/${customName}.element.js`;
    }

    async send(req, res, content) {
        res.setHeader('X-Generator', "Clevertree CMS");
        return res.send(
            await this.render(req, content)
        );
    }

}
module.exports = {ContentRenderer: new ContentRenderer()};

const CUSTOM_ELEMENT_SOURCE = {
    // 'config-editor':        '/:config/:client/config-editor.element.js',
    //
    // 'content-form-add':          '/:content/:client/content-form-add.element.js',
    // 'content-form-browser':      '/:content/:client/content-form-browser.element.js',
    // 'content-form-delete':       '/:content/:client/content-form-delete.element.js',
    // 'content-form-editor':       '/:content/:client/content-form-editor.element.js',
    // 'content-nav':          '/:content/:client/content-nav.element.js',
    // 'content-form-upload':       '/:content/:client/content-form-upload.element.js',
    //
    // // 'editor': 'database-connect.client.js',
    // // 'editor': 'database-manage.client.js',
    //
    // 'slideshow-player':     '/:content/:client/content-slideshow.element.js',
    //
    // 'task-manager':         '/:task/:client/task-manager.element.js',
    //
    // 'user-form-browser':         '/:user/:client/user-form-browser.element.js',
    // 'user-form-forgotpassword':  '/:user/:client/user-form-forgotpassword.element.js',
    // 'user-form-login':           '/:user/:client/user-form-login.element.js',
    // 'user-form-logout':          '/:user/:client/user-form-logout.element.js',
    // 'user-form-profile':         '/:user/:client/user-form-profile.element.js',
    // 'user-form-register':        '/:user/:client/user-form-register.element.js',
    // 'user-form-resetpassword':   '/:user/:client/user-form-resetpassword.element.js',
    // 'user-form-updateflags':     '/:user/:client/user-form-updateflags.element.js',
    // 'user-form-updatepassword':  '/:user/:client/user-form-updatepassword.element.js',
    // 'user-form-updateprofile':   '/:user/:client/user-form-updateprofile.element.js',
};