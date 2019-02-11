// TODO: approve all drafts

const { DatabaseManager } = require('../../database/database.manager');

class AdminConfigureTask {
    constructor() {
        this.dbMissingAdmin = {};
    }

    async isActive(database, sessionUser) {
        if(!sessionUser)
            return false;

        if(typeof this.dbMissingAdmin[database] !== 'undefined') {
            return this.dbMissingAdmin[database];
        }

        if(sessionUser.isAdmin()) {
            this.dbMissingAdmin[database] = false;
            return false;
        }

        const userDB = await DatabaseManager.getUserDB(database);
        let adminUser = await userDB.fetchUser("FIND_IN_SET('admin', u.flags) LIMIT 1");
        if(adminUser) {
            console.log(`Admin User Found [DB: ${database}]: `, adminUser);
            this.dbMissingAdmin[database] = false;

        } else {
            console.warn(`Admin User Not Found in ${database}`);
            this.dbMissingAdmin[database] = true;
        }
        return this.dbMissingAdmin[database];
    }

    async render(req, res) {

    }
}

exports.AdminConfigureTask = AdminConfigureTask;