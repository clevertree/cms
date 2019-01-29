const bcrypt = require('bcryptjs');
const uuidv4 = require('uuid/v4');

const { ConfigManager } = require('../config/config.manager');

class UserDatabase  {
    get SQL_TABLE() {
        return `
CREATE TABLE \`user\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`email\` varchar(256) NOT NULL,
  \`username\` varchar(256) NOT NULL,
  \`password\` varchar(256) DEFAULT NULL,
  \`profile\` JSON DEFAULT NULL,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`flags\` SET("guest", "admin"),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`user_email_unique\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }
    constructor(db, debug=false) {
        this.db = db;
        this.debug = debug;
    }

    async configure(prompt=false) {
        // Check for table
        const tableName = 'user';
        try {
            await this.queryAsync(`SHOW COLUMNS FROM ${tableName}`);
        } catch (e) {
            if(e.code === 'ER_NO_SUCH_TABLE') {
                await this.queryAsync(this.SQL_TABLE);
                await this.queryAsync(`SHOW COLUMNS FROM ${tableName}`);
                console.info(`Inserted table: ${tableName}`)
            } else {
                throw e;
            }
        }

        // Insert admin user
        let adminUser = await this.fetchUser("FIND_IN_SET('admin', u.flags) LIMIT 1");
        if(adminUser) {
            console.info("Admin user found: " + adminUser.id);
        } else {
            if(prompt) {
                for (let i = 0; i < 4; i++) {
                    try {
                        const hostname = require('os').hostname().toLowerCase();
                        let adminUsername = await ConfigManager.prompt(`Please enter an Administrator username`, 'admin');
                        let adminEmail = await ConfigManager.prompt(`Please enter an email address for ${adminUsername}`, adminUsername + '@' + hostname);
                        let adminPassword = await ConfigManager.prompt(`Please enter a password for ${adminUsername}`, "");
                        let adminPassword2 = await ConfigManager.prompt(`Please re-enter a password for ${adminUsername}`, "");
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
    }

    /** User Table **/

    async selectUsers(whereSQL, values, selectSQL='u.*,null as password') {
        let SQL = `
          SELECT ${selectSQL}
          FROM user u
          WHERE ${whereSQL}
          `;

        const results = await this.queryAsync(SQL, values);
        return results.map(result => new UserEntry(result))
    }

    async fetchUser(whereSQL, values, selectSQL='u.*,null as password') { return (await this.selectUsers(whereSQL, values, selectSQL))[0]; }
    async fetchUserByID(id, selectSQL='u.*,null as password') { return await this.fetchUser('u.id = ? LIMIT 1', id, selectSQL); }
    async fetchUserByEmail(email, selectSQL='u.*,null as password') { return await this.fetchUser('u.email = ? LIMIT 1', email, selectSQL); }
    // async fetchGuestUser(selectSQL='u.*,null as password') { return await this.fetchUser('FIND_IN_SET(\'guest\', u.flags) LIMIT 1', null, selectSQL); }

    async createUser(username, email, password, flags='') {
        if(Array.isArray(flags))
            flags = flgas.join(',');
        if(!username) throw new Error("Invalid username");
        if(!email) throw new Error("Invalid email");
        if(password) {
            const salt = await bcrypt.genSalt(10);
            password = await bcrypt.hash(password, salt);
        }
        let SQL = `
          INSERT INTO user SET ?`;
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
        if(email !== null) set.email = email;
        if(password !== null) set.password = password;
        if(profile !== null) set.profile = JSON.stringify(profile);
        if(flags !== null) set.flags = Array.isArray(flags) ? flags.join(',') : flags;
        let SQL = `UPDATE user SET ? WHERE id = ?`;

        return (await this.queryAsync(SQL, [set, userID]))
            .affectedRows;
    }

    /** User Session Table **/

    async selectUserSession(whereSQL, values, selectSQL='us.*') {
        let SQL = `
          SELECT ${selectSQL}
          FROM user_session us
          WHERE ${whereSQL}
          `;

        const results = await this.queryAsync(SQL, values);
        return results.map(result => new UserSessionEntry(result))
    }

    async fetchUserSessionByID(id) { return (await this.selectUserSession('us.id = ?', id))[0]; }
    async fetchUserSessionByUUID(uuid) { return (await this.selectUserSession('us.uuid = ?', uuid))[0]; }


    async createUserSession(user_id, status='active', sessionData=null) {
        const uuid = uuidv4();
        const password = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        let SQL = `
          INSERT INTO user_session SET ?`;
        const results = await this.queryAsync(SQL, {
            user_id,
            uuid,
            status,
            session: sessionData ? JSON.stringify(sessionData) : null,
            password: hash
        });

        // const userSession = await this.fetchUserSessionByID(results.insertId);
        console.info("User Session Created", results.insertId);
        return {
            uuid, password,
            insertId: results.insertId,
        };
    }

    async deleteUserSessionByID(id) {
        let SQL = `DELETE FROM user_session WHERE id = ?`;
        await this.queryAsync(SQL, id);
    }


    queryAsync(sql, values, cb) {
        if(cb)
            return this.db.query(sql, values, cb);
        return new Promise( ( resolve, reject ) => {
            this.db.query(sql, values, ( err, rows ) => {
                if(this.debug)
                    err ? console.error (err.message, sql, values || "No Values") : console.log (sql, values || "No Values");
                err ? reject (err) : resolve (rows);
            });
        });
    }
}

class UserEntry {
    constructor(row) {
        this.id = row.id;
        this.email = row.email;
        if(row.password)
            this.password = row.password;
        this.created = row.created;
        this.profile = {};
        try {
            this.profile = row.profile ? JSON.parse(row.profile) : {};
        } catch (e) {
            console.error(e);
        }
        this.flags = row.flags ? row.flags.split(',') : [];
    }

    hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }
    isAdmin() { return this.hasFlag('admin'); }
    isGuest() { return this.hasFlag('guest'); }
}



class UserSessionEntry {
    constructor(row) {
        this.id = row.id;
        this.user_id = row.user_id;
        this.password = row.password;
        this.created = row.created;
        this.status = row.status;
        this.flags = row.flags ? row.flags.split(',') : [];
        try {
            this.session = row.profile ? JSON.parse(row.profile) : {};
        } catch (e) {
            this.session = {error: e.stack};
            console.error(e);
        }
    }

    hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }
    isAdmin() { return this.hasFlag('admin'); }
    isGuest() { return this.hasFlag('guest'); }
}
module.exports = {UserEntry, UserSessionEntry, UserDatabase};

