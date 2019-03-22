const bcrypt = require('bcryptjs');
const uuidv4 = require('uuid/v4');

// const DatabaseManager = require('../database/database.manager');
const InteractiveConfig = require('../config/InteractiveConfig');
const UserRow = require("../user/UserRow");
// const LocalConfig = require('../config/local.config');
// const { ConfigDatabase } = require("../config/config.database");


// const ConfigManager = require('../config/config.manager');

class UserTable  {
    get UserAPI() { return require('./UserAPI').UserAPI; }

    constructor(dbName) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = tablePrefix + '`user`';
    }

    async configure(hostname=null) {
        // Check for tables
        await this.queryAsync(this.getTableSQL());
    }

    async configureInteractive() {
        // Find admin user
        let adminUser = await this.fetchUser("u.username = 'admin' OR FIND_IN_SET('admin', u.flags) ORDER BY u.id ASC LIMIT 1 ");

        // Set up admin user

        const interactiveConfig = new InteractiveConfig();

        if (adminUser) {
            console.info("Admin user found: " + adminUser.id);
            let resetpassword = await interactiveConfig.prompt(`Would you like to change the admin password (Username: ${adminUser.username}) [y or n]?`, false, 'boolean');
            if(resetpassword) {
                for (let i = 0; i < 4; i++) {
                    let adminPassword = await interactiveConfig.prompt(`Please enter a new password for ${adminUser.username}`, "", 'password');
                    let adminPassword2 = await interactiveConfig.prompt(`Please re-enter the new password for ${adminUser.username}`, "", 'password');
                    if (!adminPassword) {
                        console.info("Password is required");
                        continue;
                    }
                    if (adminPassword !== adminPassword2) {
                        console.error("Password mismatch");
                        continue;
                    }
                    await this.updateUser(adminUser.id, null, adminPassword);
                    console.info(`Admin user password changed (${adminUser.id}: ` + adminUser.username);
                    break;
                }
            }


            if(!adminUser.isAdmin()) {
                await this.addFlags(adminUser.id, ['admin']);
                console.info(`Admin user set to admin: ${adminUser.id}`);
            }
        }

        // Find admin user by DNS info
        if(!adminUser && false) {
            console.info("Querying WHOIS for admin email: " + hostname);
            let dnsAdminEmail = await this.UserAPI.queryAdminEmailAddresses(hostname);
            if (dnsAdminEmail) {
                // dnsAdminEmail.split('@')[0]
                adminUser = await this.createUser('admin', dnsAdminEmail, null, 'admin');
                console.info(`Admin user created from DNS info (${adminUser.id}: ` + dnsAdminEmail);
                // TODO: send email;
            }
        }

        if(!adminUser) {
            // Insert admin user
            for (let i = 0; i < 4; i++) {
                try {
                    // const hostname = require('os').hostname().toLowerCase();
                    const defaultHostname     = (require('os').hostname()).toLowerCase();
                    let adminUsername =     await interactiveConfig.prompt(`Please enter an Administrator username`, 'admin');
                    let adminEmail =        await interactiveConfig.prompt(`Please enter an email address for ${adminUsername}`, adminUsername + '@' + defaultHostname);
                    let adminPassword =     await interactiveConfig.prompt(`Please enter a password for ${adminUsername}`, "", 'password');
                    let adminPassword2 =    await interactiveConfig.prompt(`Please re-enter a password for ${adminUsername}`, "", 'password');
                    if (!adminPassword) {
                        adminPassword = (await bcrypt.genSalt(10)).replace(/\W/g, '').substr(0, 8);
                        adminPassword2 = adminPassword;
                        console.info("Using generated password: " + adminPassword);
                    }
                    if (adminPassword !== adminPassword2) {
                        console.error("Password mismatch");
                        continue;
                    }
                    adminUser = await this.createUser(adminUsername, adminEmail, adminPassword, 'admin');
                    console.info(`Admin user created (${adminUser.id}: ` + adminUsername);
                    break;
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }

    async queryAsync(SQL, values) {
        const DatabaseManager = require('../database/DatabaseManager').DatabaseManager;
        return await DatabaseManager.queryAsync(SQL, values);
    }

    /** User Table **/

    async selectUsers(whereSQL, values, selectSQL='u.*,null as password') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table} u
          WHERE ${whereSQL}
          `;

        const results = await this.queryAsync(SQL, values);
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
        return await this.fetchUser('? IN (u.id)', userID, selectSQL);
    }
    async fetchUserByKey(userID, selectSQL='u.*,null as password') {
        if(!isNaN(parseInt(userID)) && isFinite(userID)) {
            return await this.fetchUserByID(userID, selectSQL);
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
          INSERT INTO ${this.table} SET ?`;
        await this.queryAsync(SQL, {
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
        if(password) {
            const salt = await bcrypt.genSalt(10);
            set.password = await bcrypt.hash(password, salt);
        }
        if(email)   set.email = email;
        if(profile) set.profile = JSON.stringify(profile);
        if(flags)   set.flags = Array.isArray(flags) ? flags.join(',') : flags;
        let SQL = `UPDATE ${this.table} SET ? WHERE id = ?`;

        return (await this.queryAsync(SQL, [set, userID]))
            .affectedRows;
    }

    async addFlags(userID, flags) {
        if(!Array.isArray(flags))
            flags = flags.split(',').map(flag => flag.trim());
        const updateUser = await this.fetchUserByKey(userID);
        for(let i=0; i<updateUser.flags.length; i++) {
            const userFlag = updateUser.flags[i];
            if(flags.indexOf(userFlag) === -1)
                flags.push(userFlag);
        }
        return await this.updateUser(updateUser.id, null, null, null, flags);
    }

    async removeFlags(userID, flags) {
        if(!Array.isArray(flags))
            flags = flags.split(',').map(flag => flag.trim());
        const updateUser = await this.fetchUserByKey(userID);
        const newFlags = updateUser.flags.filter(flag => flags.indexOf(flag) !== -1);
        return await this.updateUser(updateUser.id, null, null, null, newFlags);
    }

    getTableSQL() {
        return `
CREATE TABLE IF NOT EXISTS ${this.table} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`email\` varchar(64) NOT NULL,
  \`username\` varchar(64) NOT NULL,
  \`password\` varchar(256) DEFAULT NULL,
  \`profile\` TEXT DEFAULT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`flags\` SET("admin", "debug"),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk.user.email\` (\`email\`),
  UNIQUE KEY \`uk.user.username\` (\`username\`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8;
`
    }


}


module.exports = UserTable;

