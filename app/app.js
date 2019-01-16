const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('client-sessions');
const path = require('path');
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

// const { UserSessionManager } = require('./user/usersession.class');
const { UserAPI } = require('./user/userapi.class');
const { ArticleAPI } = require('./article/articlieapi');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class App {
    constructor() {
        this.themes = {};
        this.db = null;

        this.loadConfig();

        this.mail = nodemailer.createTransport(smtpTransport(this.config.mail));
        this.mail.verify((error, success) => {
            if (error || !success)
                console.error(`Error connecting to ${this.config.mail.host}`, error, this.config.mail);
            else
                console.log(`Connected to ${this.config.mail.host}`);
        });

        // this.db = new DatabaseManager(this);

        this.express = express();
        this.express.use(bodyParser.urlencoded({ extended: true }));
        this.express.use(bodyParser.json());
        this.express.use(cookieParser());
        this.config.session.cookieName = 'session';
        this.express.use(session(this.config.session));


        // Post wrapper
        // this.express.post('*', this.postMiddleware);


        // Routes
        // new UserSessionManager(this).loadRoutes(this.express);
        new UserAPI(this).loadRoutes(this.express);
        new ArticleAPI(this).loadRoutes(this.express);

        // Asset files
        this.express.use(express.static(BASE_DIR));
    }

    getTheme(themeName) {
        if(!themeName)
            themeName = this.config.theme;
        if(typeof this.themes[themeName] !== 'undefined')
            return this.themes[themeName];
        const themeClass = require('../app/theme/' + themeName + '/theme.class.js');
        this.themes[themeName] = new themeClass(this);
        return this.themes[themeName];
    }

    start() {

        // HTTP
        this.express.listen(this.config.server.port);
        console.log(`Listening on ${this.config.server.port}`);
        if(this.config.debug && this.config.server.debugPort) {
            this.express.listen(this.config.server.debugPort);
            console.log(`Listening on ${this.config.server.debugPort}`);
        }

        this.createDBConnection();
    }

    createDBConnection() {
        // Mysql
        const dbConfig = this.config.mysql;
        const db = mysql.createConnection(dbConfig);
        if(this.db)
            this.db.end();
        this.db = db;

        db.on('error', (err) => {
            console.error("DB Error", err);
            if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
                setTimeout(() => this.createDBConnection(), 3000);
                db.end();
            }
        });
        db.connect({}, (err) => {
            if (err) {
                console.error(`DB Connection to '${dbConfig.database}' Failed`, err.message);
                setTimeout(() => this.createDBConnection(), 3000);
                db.end();
            } else {
                console.info(`DB Connecting to '${dbConfig.database}' Successful`);
            }
        });
        return db;
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