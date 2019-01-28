const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('client-sessions');

const { DatabaseManager } = require('../database/database.manager');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class APIManager {
    constructor() {
        this.dbm = null;
    }

    getRouter() {
        if(!this.router)
            this.init();
        return this.router;
    }

    async listen() {
        // Init Database
        this.dbm = await DatabaseManager.get();



        // this.loadConfig();


        // this.db = new DatabaseManager(this);

        this.express = express();
        // this.express.use(bodyParser.urlencoded({ extended: true }));
        // this.express.use(bodyParser.json());
        this.express.use(cookieParser());
        this.config.session.cookieName = 'session';
        this.express.use(session(this.config.session));
        // this.express.use(formidableMiddleware());


        // Post wrapper
        // this.express.post('*', this.postMiddleware);


        // Routes
        // new UserSessionManager(this).loadRoutes(this.express);
        new UserAPI(this).loadRoutes(this.express);
        new ArticleAPI(this).loadRoutes(this.express);
        new FileAPI(this).loadRoutes(this.express);

        // Asset files
        this.express.use(express.static(BASE_DIR));

        // this.createDBConnection();

        // HTTP
        this.express.listen(this.config.server.port);
        console.log(`Listening on ${this.config.server.port}`);
        if(this.config.debug && this.config.server.debugPort) {
            this.express.listen(this.config.server.debugPort);
            console.log(`Listening on ${this.config.server.debugPort}`);
        }
    }
}

exports.APIServer = new APIManager();
