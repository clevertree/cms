const session = require('client-sessions');

class UserSession {
    constructor(session) {
        this.session = session;
    }

    addMessage(message, status) {
        if(typeof this.session.messages === 'undefined')
            this.session.messages = [];
        this.session.messages.push({message, status})
    }

    popMessage() {
        if(typeof this.session.messages === 'undefined')
            return null;
        return this.session.messages.pop()
    }
}

class UserSessionManager {
    constructor(app) {
        this.app = app;
        this.config = app.config.session || {};
    }

    loadRoutes(router) {
        router.use(session({
            cookieName: 'session',
            secret: this.config.secret,
            duration: 30 * 60 * 1000,
            activeDuration: 5 * 60 * 1000,
        }));
        router.use((req, res, next) => {
            this.getSessionUser(req, (error, sessionUser) => {
                req.sessionUser = sessionUser;
                next();
            });
        });
    }

    getSessionUser(req, callback) {
        if(req.session && req.session.user) {
            this.app.user.findUserByID(req.session.user.id, (error, user) => {
                if(error)
                    return callback(error);
                callback(user?null:"No Session User Found", user);
            });
        } else {
            this.app.user.findGuestUser((error, user) => {
                if(error)
                    return callback(error);
                callback(user?null:"No Guest User Found", user);
            })
        }
    }

}

module.exports = {UserSession, UserSessionManager};

