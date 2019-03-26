const cookieParser = require('cookie-parser');
const session = require('client-sessions');
const express = require('express');

// const LocalConfig = require('../../config/LocalConfig');

class SessionAPI {
    constructor(config) {
        if(!config.cookie)
            config.cookie = {};
        if(typeof config.cookie.expires === "undefined")
            config.cookie.expires = false;

        if(!config.session)
            config.session = {};
        if(!config.session.cookieName)
            config.session.cookieName = 'session';
        if(!config.session.secret)
            config.session.secret = require('uuid/v4')();
        this.cookieConfig = config.cookie;
        this.sessionConfig = config.session;
    }

    async configure(interactive=false) {
    }


    getSessionMiddleware() {
        return (req, res, next) => {
            if(!this.routerSession)
                this.routerSession = session(this.sessionConfig);
            return this.routerSession(req, res, next);
        }
    }

    getCookieMiddleware() {
        return (req, res, next) => {
            if(!this.routerCookie)
                this.routerCookie = cookieParser(this.cookieConfig);
            return this.routerCookie(req, res, next);
        }
    }

    getMiddleware() {
        const routerSession = express.Router();
        routerSession.use(this.getSessionMiddleware());
        routerSession.use(this.getCookieMiddleware());

        return (req, res, next) => {
            return routerSession(req, res, next);
        }
    }

}


module.exports = SessionAPI;

