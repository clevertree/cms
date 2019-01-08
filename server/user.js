const bcrypt = require('bcryptjs');
const session = require('client-sessions');


// const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));
class User {
    constructor(row) {
        this.id = row.id;
        this.email = row.email;
        this.password = row.password;
        this.flag = row.flag ? row.flag.split(',') : [];
    }

    hasFlag(flag) { return this.flag.indexOf(flag) !== -1; }
}

class UserAPI {
    constructor(app) {
        this.app = app;
        // API Routes
        app.express.post('/user/login', (req, res) => this.login(req, res));
        app.express.post('/user/register', (req, res) => this.register(req, res));
        // TODO: use view manager for post
    }


    login(req, res) {
        console.log("Login Request", req.body);

        if(!req.body.email)
            return res.sendAPIError(res, "Email is required");
        if(!UserManager.validateEmail(req.body.email))
            return res.sendAPIError(res, "Email format is invalid");

        if(!req.body.password)
            return res.sendAPIError(res, "Password is required");

        this.app.user.findUserByEmail(req.body.email, (error, user) => {
            if(error)
                return res.sendAPIError(res, error.message || error);
            if(!user)
                return res.sendAPIError(res, "User not found: " + req.body.email);

            bcrypt.compare(req.body.password, user.password, (error, matches) => {
                if(error)
                    return res.sendAPIError(res, error.message || error);
                if(matches !== true)
                    return res.sendAPIError(res, "Invalid Password");
                // sets a cookie with the user's info
                req.session.reset();
                req.session.user = {id: user.id};

                return res.sendAPISuccess(`User logged in successfully: ${user.email}`);
            });

        });
    }

    register(req, res) {
        console.log("Registration Request", req.body);

        if(!req.body.email)
            return res.sendAPIError(res, "Email is required");
        if(!UserManager.validateEmail(req.body.email))
            return res.sendAPIError(res, "Email format is invalid");

        if(!req.body.password)
            return res.sendAPIError(res, "Password is required");

        if(req.body.password !== req.body.confirm_password)
            return res.sendAPIError(res, "Confirm & Password do not match");

        this.app.user.createUser(req.body.email, req.body.password, (error, user) => {
            if(error)
                return res.sendAPIError(res, error.message || error);

            req.session.reset();
            req.session.user = {id: user.id};

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

