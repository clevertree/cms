
const session = require('client-sessions');
const {UserDatabase} = require("./userdatabase.class");

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

    async getSessionUser(db) {
        const userDB = new UserDatabase(db);
        let user;
        if(this.session && this.session.user) {
            user = await userDB.findUserByID(this.session.user.id);
            if(!user)
                throw new Error("No Session User Found");
        } else {
            user = await userDB.findGuestUser();
            if(!user)
                throw new Error("No Guest User Found");
        }
        return user;
    }
}

class UserSessionManager {
    constructor(app) {
        this.app = app;
        this.config = app.config.session || {};
    }

    // get userDB () { return new UserDatabase(this.app.db); }

    loadRoutes(router) {
        router.use(session({
            cookieName: 'session',
            secret: this.config.secret,
            duration: 30 * 60 * 1000,
            activeDuration: 5 * 60 * 1000,
        }));
        // router.use(async (req, res, next) => {
        //     const sessionUser = await this.getSessionUser(req);
        //     req.sessionUser = sessionUser;
        // });
    }

    // async getSessionUser(session) {
    //     let user;
    //     if(session && session.user) {
    //         user = await this.userDB.findUserByID(session.user.id);
    //         if(!user)
    //             throw new Error("No Session User Found");
    //     } else {
    //         user = await this.userDB.findGuestUser();
    //         if(!user)
    //             throw new Error("No Guest User Found");
    //     }
    //     return new UserSession(user, session);
    // }

}

module.exports = {UserSession, UserSessionManager};

