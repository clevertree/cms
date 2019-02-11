const bcrypt = require('bcryptjs');
const uuidv4 = require('uuid/v4');

const { DatabaseManager } = require('../database/database.manager');
const { LocalConfig } = require('../config/local.config');
const { PromptManager } = require('../config/prompt.manager');


// const { ConfigManager } = require('../config/config.manager');

class UserDatabase  {
    constructor(dbName, debug=false) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = {
            user: tablePrefix + '`user`'
        };
        this.debug = debug;
    }

    async configure(interactive=false) {
        // const localConfig = new LocalConfig(config, !config);

        // Check for table
        await DatabaseManager.configureTable(this.table.user,            UserRow.getTableSQL(this.table.user));

    }

    /** User Table **/

    async selectUsers(whereSQL, values, selectSQL='u.*,null as password') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table.user} u
          WHERE ${whereSQL}
          `;

        const results = await DatabaseManager.queryAsync(SQL, values);
        return results.map(result => new UserRow(result))
    }
    // async searchUsers(search, selectSQL='u.*,null as password') {
    //     if(!isNaN(parseInt(search)) && isFinite(search)) {
    //         return await this.selectUsers('? IN (u.id)', search, selectSQL);
    //     } else {
    //         return await this.selectUsers('? IN (u.email, u.username)', search, selectSQL);
    //     }
    // }

    async fetchUser(whereSQL, values, selectSQL='u.*,null as password') {
        const users = await this.selectUsers(whereSQL, values, selectSQL);
        return users[0] || null;
    }
    async fetchUserByID(userID, selectSQL='u.*,null as password') {
        if(!isNaN(parseInt(userID)) && isFinite(userID)) {
            return await this.fetchUser('? IN (u.id)', userID, selectSQL);
        } else {
            return await this.fetchUser('? IN (u.email, u.username)', [userID, userID], selectSQL);
        }
    }
    async fetchUserByEmail(email, selectSQL='u.*,null as password') {
        return await this.fetchUser('u.email = ? LIMIT 1', email, selectSQL);
    }
    async fetchSessionUser(req, selectSQL='u.*,null as password') {

        const sessionUser = await this.fetchUserByID(req.session.userID, selectSQL);
        if(!sessionUser) {
            console.warn("Session user is missing. Logging out");
            delete req.session.userID;
            if(typeof req.session.messages === 'undefined')
                req.session.messages = [];
            req.session.messages.push("<div class='error'>Session user is missing. Logging out</div>");
        }
        return sessionUser;
    }
    // async fetchGuestUser(selectSQL='u.*,null as password') { return await this.fetchUser('FIND_IN_SET(\'guest\', u.flags) LIMIT 1', null, selectSQL); }

    async createUser(username, email, password, flags='') {
        if(Array.isArray(flags))
            flags = flags.join(',');
        if(!username) throw new Error("Invalid username");
        if(!email) throw new Error("Invalid email");
        if(password) {
            const salt = await bcrypt.genSalt(10);
            password = await bcrypt.hash(password, salt);
        }
        let SQL = `
          INSERT INTO ${this.table.user} SET ?`;
        await DatabaseManager.queryAsync(SQL, {
            username,
            email,
            password,
            flags
        });

        const user = await this.fetchUserByEmail(email);
        console.info("User Created", user);
        return user;
    }

    async updateUser(userID, email, password, profile, flags) {
        let set = {};
        if(email !== null) set.email = email;
        if(password) {
            const salt = await bcrypt.genSalt(10);
            set.password = await bcrypt.hash(password, salt);
        }
        if(profile !== null) set.profile = JSON.stringify(profile);
        if(flags !== null) set.flags = Array.isArray(flags) ? flags.join(',') : flags;
        let SQL = `UPDATE ${this.table.user} SET ? WHERE id = ?`;

        return (await DatabaseManager.queryAsync(SQL, [set, userID]))
            .affectedRows;
    }

}

class UserRow {
    static getTableSQL(tableName) {
        return `
CREATE TABLE ${tableName} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`email\` varchar(64) NOT NULL,
  \`username\` varchar(64) NOT NULL,
  \`password\` varchar(256) DEFAULT NULL,
  \`profile\` TEXT DEFAULT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`flags\` SET("admin"),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk.user.email\` (\`email\`),
  UNIQUE KEY \`uk.user.username\` (\`username\`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8;
`
    }


    constructor(row) {
        Object.assign(this, row);
        if(this.profile)
            this.profile = JSON.parse(this.profile);
        if(this.flags)
            this.flags = this.flags.split(',');
    }

    hasFlag(flag) { return this.flags && this.flags.indexOf(flag) !== -1; }
    isAdmin() { return this.hasFlag('admin'); }
    // isGuest() { return this.hasFlag('guest'); }
}


module.exports = {UserRow, UserDatabase};

