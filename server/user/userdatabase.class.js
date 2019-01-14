const bcrypt = require('bcryptjs');

class UserDatabase  {
    constructor(db) {
        this.db = db;
    }

    async findUser(fieldName, fieldValues) {
        let SQL = `
          SELECT u.*
          FROM user u
          WHERE ${fieldName}`;
        const results = await this.queryAsync(SQL, fieldValues);
        return results && results.length > 0 ? new UserEntry(results[0]) : null
    }

    async findUserByID(id) { return await this.findUser('u.id = ?', id); }
    async findUserByEmail(email) { return await this.findUser('u.email = ?', email); }
    async findGuestUser() { return await this.findUser('FIND_IN_SET(\'guest\', u.flags)', null); }

    async createUser(email, password) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        let SQL = `
          INSERT INTO user SET 
              email = ?,
              password = ?`;

        await this.queryAsync(SQL, [email, hash]);

        const user = await this.findUserByEmail(email);
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
module.exports = {UserEntry, UserDatabase};

