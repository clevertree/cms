const bcrypt = require('bcryptjs');
const uuidv4 = require('uuid/v4');

class UserDatabase  {
    constructor(db) {
        this.db = db;
    }

    /** User Table **/

    async selectUsers(whereSQL, values, selectSQL='u.*') {
        let SQL = `
          SELECT ${selectSQL}
          FROM user u
          WHERE ${whereSQL}
          `;

        const results = await this.queryAsync(SQL, values);
        return results.map(result => new UserEntry(result))
    }

    async fetchUserByID(id) { return (await this.selectUsers('u.id = ? LIMIT 1', id))[0]; }
    async fetchUserByEmail(email) { return (await this.selectUsers('u.email = ? LIMIT 1', email))[0]; }
    async fetchGuestUser() { return (await this.selectUsers('FIND_IN_SET(\'guest\', u.flags) LIMIT 1', null))[0]; }

    async createUser(email, password) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        let SQL = `
          INSERT INTO user SET ?`;
        await this.queryAsync(SQL, {email, hash});

        const user = await this.fetchUserByEmail(email);
        console.info("User Created", user);
        return user;
    }

    async updateUser(userID, email, password, profile, flags) {
        let set = {};
        if(email !== null) set.email = email;
        if(password !== null) set.password = password;
        if(profile !== null) set.profile = profile;
        if(flags !== null) set.flags = flags.join(',');
        let SQL = `UPDATE user SET profile=? WHERE id = ?`;

        await this.queryAsync(SQL, [JSON.stringify(profile), userID]);
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

    async fetchUserSessionByID(id) { return await this.selectUserSession('us.id = ?', id); }


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



    queryAsync(sql, values) {
        return new Promise( ( resolve, reject ) => {
            this.db.query(sql, values, ( err, rows, fields ) => {
                err ? reject (err) : resolve (rows);
            });
        });
    }
}

class UserEntry {
    constructor(row) {
        this.id = row.id;
        this.email = row.email;
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

