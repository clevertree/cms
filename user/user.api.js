const bcrypt = require('bcryptjs');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('client-sessions');

const { ConfigManager } = require('../config/config.manager');
const { DatabaseManager } = require('../database/database.manager');
const { ThemeManager } = require('../theme/theme.manager');
const { UserDatabase } = require('./user.database');
const { ForgotPasswordMail } = require("./mail/forgotpassword.class");

class UserAPI {
    constructor() {
        this.router = null;
    }

    async configure(interactive=false) {
        // Configure
        let config = await ConfigManager.getAll();
        if(!config) config = {};
        if(!config.user) config.user = {};
        let configSession = Object.assign({}, config.user.session || {});
        if(!configSession.secret) configSession.secret = require('uuid/v4')();

        let configCookie = Object.assign({}, config.user.cookie || {});
        configSession.cookieName = 'session';
        const router = express.Router();
        router.use(session(configSession));

        router.use(cookieParser(configCookie));

        const bodyParser = require('body-parser');
        const PM = [bodyParser.urlencoded({ extended: true }), bodyParser.json()];


        // TODO: create admin account on boot
        // TODO: handle session_save login
        // router.use(async (req, res, next) => await this.checkForSessionLogin(req, res, next));
        // API Routes
        router.get('/[:]user/:userID(\\w+)/[:]json',                async (req, res, next) => await this.handleViewRequest(true, (req.params.userID), req, res, next));
        router.get('/[:]user/:userID(\\w+)',                     async (req, res, next) => await this.handleViewRequest(false, (req.params.userID), req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]profile',         PM, async (req, res) => await this.handleUpdateRequest('profile', (req.params.userID), req, res));
        router.all('/[:]user/:userID(\\w+)/[:]flags',           PM, async (req, res) => await this.handleUpdateRequest('flags', (req.params.userID), req, res));
        router.all('/[:]user/:userID(\\w+)/[:]password',  PM, async (req, res) => await this.handleUpdateRequest('password', (req.params.userID), req, res));
        router.all('/[:]user/[:]login',                     PM, async (req, res) => await this.handleLoginRequest(req, res));
        // router.all('/[:]user/session',                   PM, async (req, res) => await this.handleSessionLoginRequest(req, res));
        router.all('/[:]user/[:]logout',                    PM, async (req, res) => await this.handleLogoutRequest(req, res));
        router.all('/[:]user/[:]register',                  PM, async (req, res) => await this.handleRegisterRequest(req, res));
        router.all('/[:]user/[:]forgotpassword',            PM, async (req, res) => await this.handleForgotPassword(req, res));

        this.router = router;
    }

    getMiddleware() {
        if(!this.router)
            this.configure(false);

        return (req, res, next) => {
            return this.router(req, res, next);
        }
    }


    addSessionMessage(req, message, status) {
        if(typeof req.session.messages === 'undefined')
            req.session.messages = [];
        req.session.messages.push({message, status})
    }

    popSessionMessage(req) {
        if(typeof req.session.messages === 'undefined' || req.session.messages.length === 0)
            return null;
        return req.session.messages.pop();
    }

    async updateProfile(req, userID, profile) {
        if(!userID)
            throw new Error("Invalid User ID");
        if(!profile)
            throw new Error("Invalid Profile");

        const userDB = await DatabaseManager.getUserDB(req);
        const user = await userDB.fetchUserByID(userID);
        if(!user)
            throw new Error("User not found: " + userID);

        for(var i=0; i<this.app.config.user.profile.length; i++) {
            const profileField = this.app.config.user.profile[i];
            let value = profile[profileField.name];
            value = encodeHTML(value);
            user.profile[profileField.name] = value;
        }

        return await userDB.updateUser(userID, null, null, user.profile, null);
        // console.info("SET PROFILE", user, profile);
        // return user;
    }


    async updateFlags(req, userID, flags) {
        const userDB = await DatabaseManager.getUserDB(req);
        if(!userID)
            throw new Error("Invalid User ID");
        // const user = await this.userDB.fetchUserByID(userID);
        // if(!user)
        //     throw new Error("User not found: " + userID);
        if(typeof flags === 'string') {
            flags = flags.join(',');
        } else if(Array.isArray(flags)) {

        } else if(typeof flags === 'object') {
            const flagObject = flags;
            flags = [];
            for(let flag in flagObject) {
                if(flagObject.hasOwnProperty(flag)) {
                    if(['on', '1'].indexOf(flagObject[flag]) !== -1)
                        flags.push(flag);
                }
            }
        }

        return await userDB.updateUser(userID, null, null, null, flags);
    }

    async updatePassword(req, userID, password_old, password_new, password_confirm) {
        if(!userID)
            throw new Error("Invalid User ID");
        const userDB = await DatabaseManager.getUserDB(req);
        const user = await userDB.fetchUserByID(userID, 'u.*');
        if(!user)
            throw new Error("User not found: " + userID);
        const encryptedPassword = user.password;
        delete user.password;

        if(!password_new)
            throw new Error("Password is required");

        if(password_new !== password_confirm && password_confirm !== null)
            throw new Error("Confirm & Password do not match");


        if(password_old !== null) {
            const matches = await bcrypt.compare(password_old, encryptedPassword);
            if(matches !== true)
                throw new Error("Old password is not correct. Please re-enter");
        }

        return await userDB.updateUser(userID, null, password_new, null, null);
    }

    async register(req, username, email, password, password_confirm) {
        if(!username)
            throw new Error("username is required");
        if(!email)
            throw new Error("Email is required");
        if(!UserAPI.validateEmail(email))
            throw new Error("Email format is invalid");

        if(!password)
            throw new Error("Password is required");

        if(password !== password_confirm && password_confirm !== null)
            throw new Error("Confirm & Password do not match");

        const userDB = await DatabaseManager.getUserDB(req);
        const user = await userDB.createUser(username, email, password);

        await this.login(req, user.id, password);
        return user;
    }


    async login(req, userID, password, saveSession=false) {
        if(!userID)
            throw new Error("Username or Email is required");
        // if(!UserAPI.validateEmail(userID))
        //     throw new Error("Email format is invalid");

        if(!password)
            throw new Error("Password is required");

        const userDB = await DatabaseManager.getUserDB(req);
        const user = await userDB.fetchUserByID(userID, 'u.*');
        if(!user)
            throw new Error("User not found: " + userID);
        const encryptedPassword = user.password;
        delete user.password;

        const matches = await bcrypt.compare(password, encryptedPassword);
        if(matches !== true)
            throw new Error("Invalid Password");

        // sets a cookie with the user's info
        req.session.reset();
        req.session.userID = user.id;

        if(saveSession) {
            // TODO: set maxAge 2 weeks
            // var ip = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
            //     req.connection.remoteAddress ||
            //     req.socket.remoteAddress ||
            //     req.connection.socket.remoteAddress
            // const sessionData = {
            //     ip
            // };
            // const result = await this.userDB.createUserSession(user.id, 'active', sessionData);
            // req.session.user_session = {id: result.insertId};
            // res.cookie('session_save', JSON.stringify({
            //     uuid: result.uuid,
            //     password: result.password,
            // }), {
            //     maxAge: 1000 * 60 * 60 * 24 * 7, // would expire after 7 days
            // })
        }

        this.addSessionMessage(req,"Login Successful: " + user.username);
        return user;
    }

    async logout(req, res) {
        const userDB = await DatabaseManager.getUserDB(req);
        if(req.session.user_session) {
            await userDB.deleteUserSessionByID(req.session.user_session);
        }
        req.session.reset();
        res.clearCookie('session_save');
        this.addSessionMessage(req,"User has been logged out");
        // TODO: destroy db session
    }

    async handleViewRequest(asJSON, userID, req, res) {
        try {
            if(!userID)
                throw new Error("Invalid user id");

            // Render View
            if(asJSON) {
                const userDB = await DatabaseManager.getUserDB(req);
                const user = await userDB.fetchUserByID(userID);
                if(!user)
                    throw new Error("User not found: " + userID);

                const response = {user};
                if(req.query['getAll'] || req.query['getSessionUser']) {
                    response.sessionUser = null;
                    if (req.session && req.session.userID) {
                        response.sessionUser = await userDB.fetchUserByID(req.session.userID);
                    }
                }
                // if(req.query.getAll || req.query.getProfileConfig)
                //     response.profileConfig = this.app.config.user.profile;
                res.json(response);

            } else {
                res.send(
                    await ThemeManager.get()
                        .render(req, `<%- include("user/element/user-profile.ejs")%>`, {
                            id: userID
                        })
                );
            }

        } catch (error) {
            console.error(error);
            if(asJSON) {
                res.status(400).json({message: "Error: " + error.message, error: error.stack});
            } else {
                res.status(400);
                res.send(
                    await ThemeManager.get()
                        .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
                );
            }
        }
    }

    // async handleSessionLoginRequest(req, res) {
    //     try {
    //         if(req.method === 'GET') {
    //             if(req.query.uuid && req.query.password) {
    //                 const userSession = await this.loginSession(req, res, req.query.uuid, req.query.password);
    //                 return res.redirect(`/:user/${userSession.user_id}`);
    //             }
    //             // Render Editor Form
    //             res.send(
    //                 await ThemeManager.get()
    //                     .render(req, `<%- include("user/section/session.ejs")%>`)
    //             );
    //
    //         } else {
    //             // Handle Form (POST) Request
    //             // console.log("Log in Request", req.body);
    //             const user = await this.loginSession(req, req.body.uuid, req.body.password);
    //
    //             return res.json({
    //                 redirect: `/:user/${user.id}`,
    //                 message: `User logged in successfully: ${user.email}. <br/>Redirecting...`,
    //                 user
    //             });
    //         }
    //     } catch (error) {
    //         console.error(error);
    //         res.status(400).json({message: "Error: " + error.message, error: error.stack});
    //     }
    // }

    async handleLoginRequest(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await ThemeManager.get()
                        .render(req, `<%- include("user/form/userform.ejs", {form: 'login'})%>`)
                );

            } else {
                // Handle Form (POST) Request
                // console.log("Log in Request", req.body);
                const user = await this.login(req, req.body.email, req.body.password, req.body.session_save);

                return res.json({
                    redirect: `/:user/${user.id}`,
                    message: `User logged in successfully: ${user.email}. <br/>Redirecting...`,
                    user
                });
            }
        } catch (error) {
            console.error(error);
            res.status(400).json({message: "Error: " + error.message, error: error.stack});
        }
    }

    async handleLogoutRequest(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await ThemeManager.get()
                        .render(req, `<%- include("user/form/userform.ejs", {form: 'logout'})%>`)
                );

            } else {
                // Handle Form (POST) Request
                console.log("Log out Request", req.body);
                await this.logout(req, res);

                return res.json({
                    redirect: `/:user/:login`,
                    message: `User logged out successfully. <br/>Redirecting...`
                });
            }
        } catch (error) {
            console.error(error);
            res.status(400).json({message: "Error: " + error.message, error: error.stack});
        }
    }

    async handleRegisterRequest(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await ThemeManager.get()
                        .render(req, `<%- include("user/form/userform.ejs", {form: 'register'})%>`)
                );

            } else {
                // Handle Form (POST) Request
                console.log("Registration Request", req.body);
                const user = await this.register(req, req.body.username, req.body.email, req.body.password, req.body.password_confirm);

                return res.json({
                    redirect: `/:user/${user.id}/:profile`,
                    message: `User registered successfully: ${user.email}. <br/>Redirecting...`,
                    user
                });
            }
        } catch (error) {
            console.error(error);
            res.status(400).json({
                message: "Error: " + error.message,
                error: error.stack,
                code: error.code,
                duplicateRegistration: error.code === "ER_DUP_ENTRY"
            });
        }
    }

    async handleForgotPassword(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await ThemeManager.get()
                        .render(req, `<%- include("user/form/userform.ejs", {form: 'forgotpassword'})%>`)
                );

            } else {
                // Handle Form (POST) Request
                // console.log("Log in Request", req.body);
                const userDB = await DatabaseManager.getUserDB(req);
                const user = await userDB.fetchUserByEmail(req.body.email);
                if(!user)
                    throw new Error("User was not found: " + req.body.email);
                const result = await userDB.createUserSession(user.id, 'reset');
                // TODO: store password reset in memory, not database!

                const recoveryURL = this.app.config.server.baseHRef + `/:user/session?uuid=${result.uuid}&password=${result.password}`;
                const mail = new ForgotPasswordMail(this.app, user, recoveryURL);
                await mail.send();

                return res.json({
                    redirect: `/:user/:login`,
                    message: `Recovery email sent successfully to ${user.email}. <br/>Redirecting...`,
                    user
                });
            }
        } catch (error) {
            console.error(error);
            res.status(400).json({message: "Error: " + error.message, error: error.stack});
        }
    }

    async handleUpdateRequest(type, userID, req, res) {
        try {
            const userDB = await DatabaseManager.getUserDB(req);
            if(!userID)
                throw new Error("Invalid user id");
            // const user = await this.userDB.fetchUserByID(userID);
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await ThemeManager.get()
                        .render(req, `<%- include("user/form/userform.ejs")%>`, {id: userID, form: type})
                );

            } else {
                if(!req.session || !req.session.userID)
                    throw new Error("Must be logged in");
                const sessionUser = await userDB.getSessionUser(req.session.userID);
                if(!sessionUser.isAdmin())
                    throw new Error("Not authorized");

                // Handle Form (POST) Request
                console.log(`Profile ${type} request`, req.body);
                let affectedRows = -1;
                switch(type) {
                    case 'profile':
                        affectedRows = await this.updateProfile(req, userID, req.body);
                        break;
                    case 'flags':
                        affectedRows = await this.updateFlags(req, userID, req.body);
                        break;
                    case 'password':
                        affectedRows = await this.updatePassword(req, userID, sessionUser.isAdmin ? null : req.body.password_old, req.body.password_new, req.body.password_confirm);
                        break;
                }
                const user = await userDB.fetchUserByID(userID);

                return res.json({
                    // redirect: `/:user/${user.id}`,
                    message: `User updated successfully (${type}): ${user.email}`,
                    user, affectedRows
                });
            }
        } catch (error) {
            console.error(error);
            res.status(400).json({message: "Error: " + error.message, error: error.stack});
        }
    }

    static validateEmail(email) {
        return email.indexOf('@') !== -1;
        // var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        // return re.test(String(email).toLowerCase());
    }
}


module.exports = {UserAPI: new UserAPI()};

function encodeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}