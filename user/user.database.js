const bcrypt = require('bcryptjs');
const uuidv4 = require('uuid/v4');

const { DatabaseManager } = require('../database/database.manager');
const { LocalConfig } = require('../config/local.config');

// const { ConfigManager } = require('../config/config.manager');

class UserDatabase  {
    constructor(dbName, debug=false) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = {
            user: tablePrefix + '`user`'
        };
        this.debug = debug;
    }

    async configure(config=null) {
        const localConfig = new LocalConfig(config, !config);

        // Check for table
        await DatabaseManager.configureTable(this.table.user,            UserRow.getTableSQL(this.table.user));

        // Insert admin user
        let adminUser = await this.fetchUser("FIND_IN_SET('admin', u.flags) LIMIT 1");
        if(adminUser) {
            console.info("Admin user found: " + adminUser.id);
        } else {
            for (let i = 0; i < 4; i++) {
                try {
                    const hostname = require('os').hostname().toLowerCase();
                    let adminUsername = await localConfig.prompt(`Please enter an Administrator username`, 'admin');
                    let adminEmail = await localConfig.prompt(`Please enter an email address for ${adminUsername}`, adminUsername + '@' + hostname);
                    let adminPassword = await localConfig.prompt(`Please enter a password for ${adminUsername}`, "");
                    let adminPassword2 = await localConfig.prompt(`Please re-enter a password for ${adminUsername}`, "");
                    if(!adminPassword) {
                        adminPassword = (await bcrypt.genSalt(10)).replace(/\W/g, '').substr(0, 8);
                        adminPassword2 = adminPassword;
                        console.info("Using generated password: " + adminPassword);
                    }
                    if (adminPassword !== adminPassword2)
                        throw new Error("Password mismatch");
                    adminUser = await this.createUser(adminUsername, adminEmail, adminPassword, 'admin');
                    console.info("Admin user created: " + adminUser.id);
                    break;
                } catch (e) {
                    console.error(e);
                }
            }
        }
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
        return users[0];
    }
    async fetchUserByID(userID, selectSQL='u.*,null as password') {
        if(!isNaN(parseInt(userID)) && isFinite(userID)) {
            return await this.fetchUser('? IN (u.id)', userID, selectSQL);
        } else {
            return await this.fetchUser('? IN (u.email, u.username)', userID, selectSQL);
        }
    }
    async fetchUserByEmail(email, selectSQL='u.*,null as password') {
        return await this.fetchUser('u.email = ? LIMIT 1', email, selectSQL);
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
        if(password !== null) set.password = password;
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
  \`email\` varchar(256) NOT NULL,
  \`username\` varchar(256) NOT NULL,
  \`password\` varchar(256) DEFAULT NULL,
  \`profile\` JSON DEFAULT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`flags\` SET("admin"),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk.user.email\` (\`email\`),
  UNIQUE KEY \`uk.user.username\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
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

