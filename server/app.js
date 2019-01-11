const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const { UserAPI, UserSessionManager, UserManager } = require('./manager/user.js');
const { ArticleManager } = require('./manager/article.js');
const { DatabaseManager } = require('./manager/database.js');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class App {
    constructor() {
        this.loadConfig();

        this.themes = {};
        this.api = {};


        this.user = new UserManager(this);
        this.session = new UserSessionManager(this);

        this.article = new ArticleManager(this);

        this.db = new DatabaseManager(this);

        this.express = express();
        this.express.use(bodyParser.urlencoded({ extended: true }));
        this.express.use(bodyParser.json());


        // Post wrapper
        // this.express.post('*', this.postMiddleware);


        // Routes
        this.session.loadRoutes(this.express);
        this.article.loadRoutes(this.express);
        this.user.loadRoutes(this.express);

        // Asset files
        this.express.use(express.static(BASE_DIR));
    }

    // TODO: refactor
    // postMiddleware(req, res, next) {
    //     const isJSONRequest = req.headers.accept.split(',').indexOf('application/json') !== -1;
    //
    //     console.info("POST", req.url);
    //     res.sendAPIError = (message, redirect=null) => {
    //         res.sendAPIResponse(message, redirect, 404);
    //     };
    //     res.sendAPIResponse = (message, redirect=null, status=200) => {
    //         console[status === 200 ? 'info' : 'error']("API: ", message);
    //         if(status)
    //             res.status(status);
    //         if(isJSONRequest) {
    //             res.json({success: status === 200, message: message, redirect: redirect});
    //             return;
    //         }
    //         let redirectHTML = '';
    //         if(redirect)
    //             redirectHTML = `<script>setTimeout(()=>document.location.href = '${redirect}', 3000);</script>`;
    //
    //         const theme = this.getTheme(this.config.theme || 'minimal');
    //         theme.handleArticleRequest({
    //             title: message,
    //             content: `
    //                         <section>
    //                             <h4>${message}</h4>
    //                             ${redirectHTML}
    //                         </section>
    //                         `,
    //             // redirect: redirect
    //         }, req, res);
    //     };
    //     next();
    // }

    getTheme(themeName) {
        if(!themeName)
            themeName = this.config.theme;
        if(typeof this.themes[themeName] !== 'undefined')
            return this.themes[themeName];
        const themeClass = require('../client/theme/' + themeName + '/theme.class.js');
        this.themes[themeName] = new themeClass(this);
        return this.themes[themeName];
    }

    start() {

        // HTTP
        this.express.listen(this.config.port);
        console.log(`Listening on ${this.config.port}`);

        this.db.connect();
    }

    loadConfig() {
        try {
            // noinspection JSFileReferences
            this.config = require('../config.js');
        } catch (e) {
            this.config = require('./config.sample.js');
        }
        this.config.theme = this.config.theme || 'minimal';
    }

}

exports.App = App;