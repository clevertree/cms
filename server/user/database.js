const { DatabaseManager } = require('../database/manager.js');

class UserDatabase extends DatabaseManager {
    constructor(db) {
        super(db)
    }

    async findUser(fieldName, fieldValues, callback) {
        let SQL = `
          SELECT u.*
          FROM user u
          WHERE ${fieldName}`;
        return await this.queryAsync(SQL, fieldValues, (error, results, fields) => {
            callback(error, results && results.length > 0 ? new UserEntry(results[0]) : null);
        });
    }

    findUserByID(id, callback) { return this.findUser('u.id = ?', id, callback); }
    findUserByEmail(email, callback) { return this.findUser('u.email = ?', email, callback); }
    findGuestUser(callback) { return this.findUser('FIND_IN_SET(\'guest\', u.flags)', null, callback); }

    createUser(email, password, callback) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, (err, hash) => {
                let SQL = `
                  INSERT INTO user SET 
                      email = ?,
                      password = ?`;

                this.db.query(SQL, [email, hash], (error) => {
                    if(error) {
                        callback && callback(error, null);
                        return;
                    }
                    this.findUserByEmail(email, (error, user) => {
                        callback && callback(error, user);
                        console.info("User Created", user);
                    });
                });
            });
        });

    }
}

class UserEntry {
    constructor(row) {
        this.id = row.id;
        this.email = row.email;
        this.password = row.password;
        this.flags = row.flags ? row.flags.split(',') : [];
    }

    hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }

    static validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}
module.exports = {UserEntry, UserDatabase};

