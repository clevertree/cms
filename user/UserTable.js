const bcrypt = require('bcryptjs');
// const uuidv4 = require('uuid/v4');

const UserRow = require('./UserRow');
const InteractiveConfig = require('../config/InteractiveConfig');

const FLAG_LIST = {
    'admin':        "Administrator",
    'debug':        "Debugger",
    'email':        "Email: Receive an email notification",
    'email:view':   "Email: View message content in Email"
};
class UserTable  {

    constructor(dbName, dbClient) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = tablePrefix + '`user`';
        this.dbClient = dbClient;
    }

    async init() {
        // Check for tables
        await this.dbClient.queryAsync(this.getTableSQL());
        await this.dbClient.queryAsync(this.getTableUpgradeSQL());
    }

    async configure(hostname, interactive=false) {

        // Find admin user
        let adminUser = await this.fetchUser("u.username = 'admin' OR FIND_IN_SET('admin', u.flags) ORDER BY u.id ASC LIMIT 1 ");

        // Set up admin user

        const interactiveConfig = new InteractiveConfig({}, interactive);

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
        // if(!adminUser && false) {
        //     console.info("Querying WHOIS for admin email: " + hostname);
        //     let dnsAdminEmail = await this.UserAPI.queryAdminEmailAddresses(hostname);
        //     if (dnsAdminEmail) {
        //         // dnsAdminEmail.split('@')[0]
        //         adminUser = await this.createUser('admin', dnsAdminEmail, null, 'admin');
        //         console.info(`Admin user created from DNS info (${adminUser.id}: ` + dnsAdminEmail);
        //         // TODO: send email;
        //     }
        // }

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
                    adminUser = await this.createUser(adminUsername, adminEmail, adminPassword, 'admin, email');
                    console.info(`Admin user created (${adminUser.id}: ` + adminUsername);
                    break;
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }

    /** User Table **/

    async selectUsers(whereSQL, values, selectSQL=null, groupBy=null, orderBy='u.id DESC', limit=25) {
        selectSQL = selectSQL || 'u.*,null as password';
        if(groupBy)
            whereSQL += " GROUP BY " + groupBy;
        if(orderBy)
            whereSQL += " ORDER BY " + orderBy;
        if(limit)
            whereSQL += " LIMIT " + limit;


        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table} u
          WHERE ${whereSQL}
          `;

        const results = await this.dbClient.queryAsync(SQL, values);
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
        const users = await this.selectUsers(whereSQL, values, selectSQL, null, null, null);
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
    // async fetchSessionUser(req, selectSQL='u.*,null as password') {
    //
    //     const sessionUser = await this.fetchUserByID(req.session.userID, selectSQL);
    //     if(!sessionUser) {
    //         console.warn("Session user is missing. Logging out");
    //         delete req.session.userID;
    //         if(typeof req.session.messages === 'undefined')
    //             req.session.messages = [];
    //         req.session.messages.push("<div class='error'>Session user is missing. Logging out</div>");
    //     }
    //     return sessionUser;
    // }
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
        await this.dbClient.queryAsync(SQL, {
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

        return (await this.dbClient.queryAsync(SQL, [set, userID]))
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
  \`flags\` SET("${Object.keys(FLAG_LIST).join('", "')}"),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk.user.email\` (\`email\`),
  UNIQUE KEY \`uk.user.username\` (\`username\`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8;
`
    }

    getTableUpgradeSQL() {
        return `
ALTER TABLE ${this.table} 
CHANGE COLUMN \`flags\` \`flags\` SET("${Object.keys(FLAG_LIST).join('", "')}") NULL DEFAULT NULL ;
`
    }

}
UserTable.FLAG_LIST = FLAG_LIST;

module.exports = UserTable;

