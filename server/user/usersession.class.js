
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
            user = await userDB.fetchUserByID(this.session.user.id);
            if(!user)
                throw new Error("No Session User Found");
        } else {
            user = await userDB.fetchGuestUser();
            if(!user)
                throw new Error("No Guest User Found");
        }
        return user;
    }
}


module.exports = {UserSession};

