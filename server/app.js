const express = require('express');

const { UserAPI, UserSessionManager, UserManager } = require('./manager/user.js');
const { ViewManager } = require('./manager/view.js');
const { DatabaseManager } = require('./manager/database.js');

class App {
    constructor() {
        this.loadConfig();

        this.themes = {};
        this.api = {};


        this.user = new UserManager(this);
        this.session = new UserSessionManager(this);
        this.api.user = new UserAPI(this);

        this.view = new ViewManager(this);

        this.db = new DatabaseManager(this);

        // Routes;
        this.express = express();
        this.session.loadRoutes(this.express);
        this.view.loadRoutes(this.express);

        // API Routes
        this.api.user.loadRoutes(this.express);
    }

    getTheme(themeName) {
        if(typeof this.themes[themeName] !== 'undefined')
            return this.themes[themeName];
        const themeClass = require('../theme/' + themeName + '/template/theme.js');
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