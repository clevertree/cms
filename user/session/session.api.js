const cookieParser = require('cookie-parser');
const session = require('client-sessions');
const express = require('express');

const { LocalConfig } = require('../../config/local.config');

class SessionAPI {
    constructor() {
        this.cookieConfig = {};
        this.sessionConfig = {};
    }

    async configure(promptCallback=null) {
        const localConfig = new LocalConfig();
        this.cookieConfig = await localConfig.getOrCreate('cookie');


        this.sessionConfig = await localConfig.getOrCreate('session');

        if(!this.sessionConfig.cookieName)
            this.sessionConfig.cookieName = 'session';
        if(!this.sessionConfig.secret)
            this.sessionConfig.secret = require('uuid/v4')();

        await localConfig.saveAll();
    }

    getSessionMiddleware() {
        return session(this.sessionConfig);
    }

    getCookieMiddleware() {
        return cookieParser(this.cookieConfig);
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

