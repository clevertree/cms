// const fs = require('fs');
// const path = require('path');
// const url = require('url');
const express = require('express');

// const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));

// Init
module.exports = function(app) {
    app.users = new UserManager(app);
};

class UserManager {
    constructor(app) {
        this.app = app;

        // API Routes
        const userRouter = express.Router(null);

        userRouter.post('/login', (req, res) => this.handleLogin(req, res));
        userRouter.post('/register', (req, res) => this.handleRegister(req, res));

        app.use('/', userRouter);        // Register Routes
    }

    findUser(fieldName, fieldValue, callback) {
        let SQL = `
          SELECT u.*
          FROM user u
          WHERE ${fieldName} = ?`;
        this.app.db.query(SQL, [fieldValue], (error, results, fields) => {
            callback(error, error ? null : new User(results[0]));
        });
    }

    findUserByID(id, callback) { return this.findUser('u.id', id, callback); }
    findUserByEmail(email, callback) { return this.findUser('u.email', email, callback); }

    createUser(email, password, callback) {
        let SQL = `
          INSERT INTO user SET 
              email = ?,
              \`password\` = ?`;
        this.app.db.query(SQL, [email, password], (error) => {
            if(error) {
                callback && callback(error, null);
                return;
            }
            this.findUserByEmail(email, (error, user) => {
                callback && callback(error, user);
                console.info("User Created", user);
            });
        });
    }

    handleLogin(req, res) {
        console.log("Login Request", req.body);
        const response = {success: false};

        if(!req.body.email)
            return res.status(404).json({success: false, message: "Email is required"});
        if(!UserManager.validateEmail(req.body.email))
            return res.status(404).json({success: false, message: "Email format is invalid"});

        this.findUserByEmail(req.body.email, (error, user) => {
            if(error)
                return res.status(404).json({success: false, message: error.message || error});

            // sets a cookie with the user's info
            req.session.reset();
            req.session.user = {id: user.id};

            res.json({
                success: true,
                message: `User logged in successfully: ${user.email}`
            });
        });
    }

    handleRegister(req, res) {
        console.log("Registration Request", req.body);
        const response = {success: false};

        if(!req.body.email)
            return res.status(404).json({success: false, message: "Email is required"});
        if(!UserManager.validateEmail(req.body.email))
            return res.status(404).json({success: false, message: "Email format is invalid"});

        if(!req.body.password)
            return res.status(404).json({success: false, message: "Password is required"});

        this.createUser(req.body.email, req.body.password, (error, user) => {
            if(error)
                return res.status(404).json({success: false, message: error.message || error});

            res.json({
                success: true,
                message: `User created successfully: ${user.email}`
            });
        });
    }

    static validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}

class User {
    constructor(row) {
        Object.assign(this, row);
    }
}