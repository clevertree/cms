// TODO: approve all drafts


class AdminConfigureTask {
    constructor() {
    }

    async configure() {

    }

    async isActive(database, user) {
        if(user && user.isAdmin())
            return;
        const { DatabaseManager } = require('../../database/database.manager');
        const userDB = await DatabaseManager.getUserDB(database);
        let adminUser = await userDB.fetchUser("FIND_IN_SET('admin', u.flags) LIMIT 1");
        console.log("Querying Admin User: ", adminUser);
        return !adminUser;
    }
}

exports.AdminConfigureTask = AdminConfigureTask;