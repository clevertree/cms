const bcrypt = require('bcryptjs');
const session = require('client-sessions');


// const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));
class User {
    constructor(row) {
        Object.assign(this, row);
        this.flag = this.flag ? this.flag.split(',') : [];
    }

    hasFlag(flag) { return this.flag.indexOf(flag) !== -1; }
}

class UserAPI {
    constructor(app) {
        // API Routes
        app.express.post('(/user)?/login', (req, res) => this.login(req, res));
        app.express.post('(/user)?/register', (req, res) => this.register(req, res));
    }

    login(req, res) {
        console.log("Login Request", req.body);

        if(!req.body.email)
            return res.status(404).json({success: false, message: "Email is required"});
        if(!UserManager.validateEmail(req.body.email))
            return res.status(404).json({success: false, message: "Email format is invalid"});

        if(!req.body.password)
            return res.status(404).json({success: false, message: "Password is required"});

        this.findUserByEmail(req.body.email, (error, user) => {
            if(error)
                return res.status(404).json({success: false, message: error.message || error});

            bcrypt.compare(req.body.password, user.password, (err, matches) => {
                if(err)
                    return res.status(404).json({success: false, message: err.message || err});
                if(matches !== true)
                    return res.status(404).json({success: false, message: "Invalid Password"});
                // sets a cookie with the user's info
                req.session.reset();
                req.session.user = {id: user.id};

                res.json({
                    success: true,
                    message: `User logged in successfully: ${user.email}`
                });
            });

        });
    }

    register(req, res) {
        console.log("Registration Request", req.body);
        const response = {success: false};

        if(!req.body.email)
            return res.status(404).json({success: false, message: "Email is required"});
        if(!UserManager.validateEmail(req.body.email))
            return res.status(404).json({success: false, message: "Email format is invalid"});

        if(!req.body.password)
            return res.status(404).json({success: false, message: "Password is required"});

        bcrypt.hash('myPassword', 10, function(err, hash) {
            // Store hash in database
        });

        this.createUser(req.body.email, req.body.password, (error, user) => {
            if(error)
                return res.status(404).json({success: false, message: error.message || error});

            res.json({
                success: true,
                message: `User created successfully: ${user.email}`
            });
        });
    }

}

class UserManager {
    constructor(app) {
        this.app = app;
    }

    findUser(fieldName, fieldValues, callback) {
        let SQL = `
          SELECT u.*
          FROM user u
          WHERE ${fieldName}`;
        this.app.db.query(SQL, fieldValues, (error, results, fields) => {
            callback(error, results && results.length > 0 ? new User(results[0]) : null);
        });
    }

    findUserByID(id, callback) { return this.findUser('u.id = ?', id, callback); }
    findUserByEmail(email, callback) { return this.findUser('u.email = ?', email, callback); }
    findGuestUser(callback) { return this.findUser('FIND_IN_SET(\'guest\', u.flag)', null, callback); }

    getSessionUser(req, callback) {
        if(req.session && req.session.user) {
            this.findUserByID(req.session.user.id, (error, user) => {
                if(error)
                    return callback(error);
                callback(user?null:"No Session User Found", user);
            });
        } else {
            this.findGuestUser((error, user) => {
                if(error)
                    return callback(error);
                callback(user?null:"No Guest User Found", user);
            })
        }
    }

    createUser(email, password, callback) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, (err, hash) => {
                let SQL = `
                  INSERT INTO user SET 
                      email = ?,
                      password = ?`;

                this.app.db.query(SQL, [email, hash], (error) => {
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

    static validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}

class UserSessionManager {
    constructor(app) {
        // this.app = app;

        app.express.use(session({
            cookieName: 'session',
            secret: 'random_string_goes_here',
            duration: 30 * 60 * 1000,
            activeDuration: 5 * 60 * 1000,
        }));
    }
}


module.exports = {User, UserSessionManager, UserManager, UserAPI};