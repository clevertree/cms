const bcrypt = require('bcryptjs');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('client-sessions');

const { ForgotPasswordMail } = require("./mail/forgotpassword.class");

const { UserDatabase } = require('./userdatabase.class');
const { UserSession } = require('./usersession.class');
class UserAPI {
    constructor() {
    }
    get userDB() { return new UserDatabase(this.app.db); }

    get middleware() {
        const router = express.Router();
        const bodyParser = require('body-parser');
        const PM = [bodyParser.urlencoded({ extended: true }), bodyParser.json()];

        // router.use(cookieParser());
        // this.config.session.cookieName = 'session';
        // router.use(session(serverConfig.session));

        // TODO: handle session_save login
        router.use(async (req, res, next) => await this.checkForSessionLogin(req, res, next));
        // API Routes
        router.get('/:?user/:id(\\d+)/json',                async (req, res, next) => await this.handleViewRequest(true, parseInt(req.params.id), req, res, next));
        router.get('/:?user/:id(\\d+)',                     async (req, res, next) => await this.handleViewRequest(false, parseInt(req.params.id), req, res, next));
        router.all('/:?user/:id(\\d+)/profile',         PM, async (req, res) => await this.handleUpdateRequest('profile', parseInt(req.params.id), req, res));
        router.all('/:?user/:id(\\d+)/flags',           PM, async (req, res) => await this.handleUpdateRequest('flags', parseInt(req.params.id), req, res));
        router.all('/:?user/:id(\\d+)/changepassword',  PM, async (req, res) => await this.handleUpdateRequest('changepassword', parseInt(req.params.id), req, res));
        router.all('/:?user/login',                     PM, async (req, res) => await this.handleLoginRequest(req, res));
        router.all('/:?user/session',                   PM, async (req, res) => await this.handleSessionLoginRequest(req, res));
        router.all('/:?user/logout',                    PM, async (req, res) => await this.handleLogoutRequest(req, res));
        router.all('/:?user/register',                  PM, async (req, res) => await this.handleRegisterRequest(req, res));
        router.all('/:?user/forgotpassword',            PM, async (req, res) => await this.handleForgotPassword(req, res));
        return (req, res, next) => {
            return router(req, res, next);
        }
    }

    async checkForSessionLogin(req, res, next) {
        try {
            // console.log(req.session, req.cookies);
            if (!req.session.user && req.cookies.session_save) {
                const session_save = JSON.parse(req.cookies.session_save);
                await this.loginSession(req, res, session_save.uuid, session_save.password);
            }
        } catch (error) {
            res.clearCookie('session_save');
            new UserSession(req.session).addMessage("User has been logged out: " + error.message);
            console.error(error);
        }
        next();
    }

    async updateProfile(userID, profile) {
        if(!userID)
            throw new Error("Invalid User ID");
        if(!profile)
            throw new Error("Invalid Profile");

        const user = await this.userDB.fetchUserByID(userID);
        if(!user)
            throw new Error("User not found: " + userID);

        for(var i=0; i<this.app.config.user.profile.length; i++) {
            const profileField = this.app.config.user.profile[i];
            let value = profile[profileField.name];
            value = encodeHTML(value);
            user.profile[profileField.name] = value;
        }

        return await this.userDB.updateUser(userID, null, null, user.profile, null);
        // console.info("SET PROFILE", user, profile);
        // return user;
    }


    async updateFlags(userID, flags) {
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

        return await this.userDB.updateUser(userID, null, null, null, flags);
    }

    async updatePassword(userID, password_old, password_new, password_confirm) {
        if(!userID)
            throw new Error("Invalid User ID");
        const user = await this.userDB.fetchUserByID(userID, 'u.*');
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

        return await this.userDB.updateUser(userID, null, password_new, null, null);
    }

    async register(session, email, password, password_confirm) {
        if(!email)
            throw new Error("Email is required");
        if(!UserAPI.validateEmail(email))
            throw new Error("Email format is invalid");

        if(!password)
            throw new Error("Password is required");

        if(password !== password_confirm && password_confirm !== null)
            throw new Error("Confirm & Password do not match");

        const user = await this.userDB.createUser(email, password);

        // sets a cookie with the user's info
        session.reset();
        session.user = {id: user.id};
        return user;
    }


    async loginSession(req, res, uuid, password) {
        if(!uuid)
            throw new Error("UUID is required");
        if(!password)
            throw new Error("Password is required");

        const userSession = await this.userDB.fetchUserSessionByUUID(uuid);
        if(!userSession)
            throw new Error("User Session not found: " + uuid);

        const matches = await bcrypt.compare(password, userSession.password);
        if(matches !== true)
            throw new Error("Invalid Password");

        const user = await this.userDB.fetchUserByID(userSession.user_id);
        if(!user)
            throw new Error("User not found: " + userSession.user_id);

        // sets a cookie with the user's info
        req.session.reset();
        req.session.user = {id: user.id};
        new UserSession(req.session).addMessage("Session Login Successful: " + uuid);
        return userSession;
    }

    async login(req, res, email, password, saveSession=false) {
        if(!email)
            throw new Error("Email is required");
        if(!UserAPI.validateEmail(email))
            throw new Error("Email format is invalid");

        if(!password)
            throw new Error("Password is required");

        const user = await this.userDB.fetchUserByEmail(email, 'u.*');
        if(!user)
            throw new Error("User not found: " + email);
        const encryptedPassword = user.password;
        delete user.password;

        const matches = await bcrypt.compare(password, encryptedPassword);
        if(matches !== true)
            throw new Error("Invalid Password");

        // sets a cookie with the user's info
        req.session.reset();
        req.session.user = {id: user.id};

        if(saveSession) {
            var ip = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress
            const sessionData = {
                ip
            };
            const result = await this.userDB.createUserSession(user.id, 'active', sessionData);
            req.session.user_session = {id: result.insertId};
            res.cookie('session_save', JSON.stringify({
                uuid: result.uuid,
                password: result.password,
            }), {
                maxAge: 1000 * 60 * 60 * 24 * 7, // would expire after 7 days
            })
        }

        new UserSession(req.session).addMessage("Login Successful: " + email);
        return user;
    }

    async logout(req, res) {
        if(req.session.user_session) {
            await this.userDB.deleteUserSessionByID(req.session.user_session);
        }
        req.session.reset();
        res.clearCookie('session_save');
        new UserSession(req.session).addMessage("User has been logged out");
        // TODO: destroy db session
    }

    async handleViewRequest(asJSON, userID, req, res) {
        try {
            if(!userID)
                throw new Error("Invalid user id");
            const user = await this.userDB.fetchUserByID(userID);

            // Render View
            if(asJSON) {
                const sessionUser = await new UserSession(req.session).getSessionUser(this.app.db);
                // if(!sessionUser)
                //     throw new Error("Must be logged in");
                const response = {user, editable: false};
                if(sessionUser.isAdmin() || sessionUser.id === userID)
                    response.editable = sessionUser.isAdmin() ? 'admin' : 'user';
                if(req.query.getAll || req.query.getProfileConfig)
                    response.profileConfig = this.app.config.user.profile;
                res.json(response);

            } else {
                res.send(
                    await this.app.getTheme()
                        .render(req, `<%- include("user/section/user.ejs")%>`, {
                            user
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
                    await this.app.getTheme()
                        .render(req, `<section class='error'><pre><%=message%></pre></section>`, {message: error.stack})
                );
            }
        }
    }

    async handleSessionLoginRequest(req, res) {
        try {
            if(req.method === 'GET') {
                if(req.query.uuid && req.query.password) {
                    const userSession = await this.loginSession(req, res, req.query.uuid, req.query.password);
                    return res.redirect(`/:user/${userSession.user_id}`);
                }
                // Render Editor Form
                res.send(
                    await this.app.getTheme()
                        .render(req, `<%- include("user/section/session.ejs")%>`)
                );

            } else {
                // Handle Form (POST) Request
                // console.log("Log in Request", req.body);
                const user = await this.loginSession(req, res, req.body.uuid, req.body.password);

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

    async handleLoginRequest(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await this.app.getTheme()
                        .render(req, `<%- include("user/section/login.ejs")%>`)
                );

            } else {
                // Handle Form (POST) Request
                // console.log("Log in Request", req.body);
                const user = await this.login(req, res, req.body.email, req.body.password, req.body.session_save);

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
                    await this.app.getTheme()
                        .render(req, `<%- include("user/section/logout.ejs")%>`)
                );

            } else {
                // Handle Form (POST) Request
                console.log("Log out Request", req.body);
                await this.logout(req, res);

                return res.json({
                    redirect: `/:user/login`,
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
                    await this.app.getTheme()
                        .render(req, `<%- include("user/section/register.ejs")%>`)
                );

            } else {
                // Handle Form (POST) Request
                console.log("Registration Request", req.body);
                const user = await this.register(req.session, req.body.email, req.body.password, req.body.password_confirm);

                return res.json({
                    redirect: `/:user/${user.id}/profile`,
                    message: `User registered successfully: ${user.email}. <br/>Redirecting...`,
                    user
                });
            }
        } catch (error) {
            console.error(error);
            res.status(400).json({message: "Error: " + error.message, error: error.stack});
        }
    }

    async handleForgotPassword(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await this.app.getTheme()
                        .render(req, `<%- include("user/section/forgotpassword.ejs")%>`)
                );

            } else {
                // Handle Form (POST) Request
                // console.log("Log in Request", req.body);
                const user = await this.userDB.fetchUserByEmail(req.body.email);
                if(!user)
                    throw new Error("User was not found: " + req.body.email);
                const result = await this.userDB.createUserSession(user.id, 'reset');

                const recoveryURL = this.app.config.server.baseHRef + `/:user/session?uuid=${result.uuid}&password=${result.password}`;
                const mail = new ForgotPasswordMail(this.app, user, recoveryURL);
                await mail.send();

                return res.json({
                    redirect: `/:user/login`,
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
            const sessionUser = await new UserSession(req.session).getSessionUser(this.app.db);
            if(!sessionUser)
                throw new Error("Must be logged in");
            if(!userID)
                throw new Error("Invalid user id");
            // const user = await this.userDB.fetchUserByID(userID);
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await this.app.getTheme()
                        .render(req, `<%- include("user/section/${type}.ejs", {id: ${userID}})%>`)
                );

            } else {
                if(!sessionUser.isAdmin())
                    throw new Error("Not authorized");

                // Handle Form (POST) Request
                console.log(`Profile ${type} request`, req.body);
                let affectedRows = -1;
                switch(type) {
                    case 'profile':
                        affectedRows = await this.updateProfile(userID, req.body);
                        break;
                    case 'flags':
                        affectedRows = await this.updateFlags(userID, req.body);
                        break;
                    case 'changepassword':
                        affectedRows = await this.updatePassword(userID, sessionUser.isAdmin ? null : req.body.password_old, req.body.password_new, req.body.password_confirm);
                        break;
                }
                const user = await this.userDB.fetchUserByID(userID);

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
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}


module.exports = {UserAPI: new UserAPI()};

function encodeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
// function isJSON(req) {
//     return req.headers.accept.split(',').indexOf('application/json') !== -1;
// }

// function sendResponse(req, res, response, redirect) {
//     if(!redirect)
//         redirect = req.url;
//     if(typeof response === "string")
//         response = {message: response, redirect};
//     if(isJSON(req)) {
//         res.json(response);
//     } else {
//         new UserSession(req.session).addMessage(response.message);
//         res.redirect(redirect);
//     }
// }