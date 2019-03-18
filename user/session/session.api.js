const cookieParser = require('cookie-parser');
const session = require('client-sessions');
const express = require('express');

const { LocalConfig } = require('../../config/local.config');

class SessionAPI {
    constructor() {
        this.cookieConfig = {
            cookieName: 'session'
        };
        this.sessionConfig = {
            cookieName: 'session',
            secret: require('uuid/v4')()
        };
        this.routerSession = null;
        this.routerCookie = null;
    }

    async configure(config=null) {
        if(config && typeof config.session === 'object') {
            Object.assign(this.sessionConfig, config.session);
        } else {
            const localConfig = new LocalConfig();
            const sessionConfig = await localConfig.getOrCreate('session');
            Object.assign(this.sessionConfig, sessionConfig);
            // Object.assign(sessionConfig, this.sessionConfig);
            // await localConfig.saveAll()
        }

        if(config && typeof config.cookie === 'object') {
            Object.assign(this.cookieConfig, config.cookie);
        } else {
            const localConfig = new LocalConfig();
            const cookieConfig = await localConfig.getOrCreate('cookie');
            Object.assign(this.cookieConfig, cookieConfig);
            // Object.assign(cookieConfig, this.cookieConfig);
            // await localConfig.saveAll()
        }


    }


    async configureInteractive() {
        await this.configure();
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


module.exports = {SessionAPI: new SessionAPI()};

