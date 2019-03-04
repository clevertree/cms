const bcrypt = require('bcryptjs');
// const cookieParser = require('cookie-parser');
// const session = require('client-sessions');
const uuidv4 = require('uuid/v4');
const path = require('path');

const { DNSManager } = require('../domain/dns.manager');

// const { LocalConfig } = require('../config/local.config');
// const { ConfigManager } = require('../config/config.manager');
const { DatabaseManager } = require('../database/database.manager');
// const { ContentDatabase } = require("../article/article.database");
const { UserDatabase } = require('./user.database');
const { ConfigDatabase } = require("../config/config.database");
const { SessionAPI } = require('../session/session.api');
const { HTTPServer } = require('../http/http.server');

// const { DNSManager } = require('../service/domain/dns.manager');
const { ThemeAPI } = require('../theme/theme.api');
const { TaskAPI } = require('../task/task.api');
const { ResetPasswordMail } = require("./mail/resetpassword.mail");

const DIR_USER = path.resolve(__dirname);

class UserAPI {
    constructor() {
        this.resetPasswordRequests = {
            'aa196dc0-f51f-4a79-a858-53c3b3b03097': 101
        };
    }


    getMiddleware() {
        const express = require('express');
        // const localConfig = new LocalConfig(config, !config);
        // const cookieConfig = await localConfig.getOrCreate('cookie');

        const sessionConfig = {}; //await localConfig.getOrCreate('session');
        // if(!sessionConfig.secret) {
        //     sessionConfig.secret = require('uuid/v4')();
        //     await localConfig.saveAll();
        // }
        sessionConfig.cookieName = 'session';

        const bodyParser = require('body-parser');

        const router = express.Router();
        // TODO: handle session_save login
        // router.use(async (req, res, next) => await this.checkForSessionLogin(req, res, next));
        // API Routes
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());
        router.use(SessionAPI.getMiddleware());

        router.all('/[:]user/:userID(\\w+)',                         async (req, res, next) => await this.handleUpdateRequest('profile', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]edit',                 async (req, res, next) => await this.handleUpdateRequest('edit', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]profile',              async (req, res, next) => await this.handleUpdateRequest('updateprofile', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]flags',                async (req, res, next) => await this.handleUpdateRequest('updateflags', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]password',             async (req, res, next) => await this.handleUpdateRequest('updatepassword', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]resetpassword/:uuid', async (req, res) => await this.handleResetPassword(req.params.userID, req.params.uuid, req, res));
        router.all('/[:]user/[:]login',                              async (req, res) => await this.handleLoginRequest(req, res));
        // router.all('/[:]user/session',                               async (req, res) => await this.handleSessionLoginRequest(req, res));
        router.all('/[:]user/[:]logout',                             async (req, res) => await this.handleLogoutRequest(req, res));
        router.all('/[:]user/[:]register',                           async (req, res) => await this.handleRegisterRequest(req, res));
        router.all('/[:]user/[:]forgotpassword',                     async (req, res, next) => await this.handleForgotPassword(req, res, next));
        router.all('/[:]user(/[:]list)?',                            async (req, res) => await this.handleBrowserRequest(req, res));


        // User Asset files
        router.get('/[:]user/[:]client/*',                          async (req, res, next) => await this.handleUserStaticFiles(req, res, next));

        return (req, res, next) => {
            if(!req.url.startsWith('/:user'))
                return next();
            return router(req, res, next);
        }
    }


    async handleUserStaticFiles(req, res, next) {
        const routePrefix = '/:user/:client/';
        if(!req.url.startsWith(routePrefix))
            throw new Error("Invalid Route Prefix: " + req.url);
        const assetPath = req.url.substr(routePrefix.length);

        const staticFile = path.resolve(DIR_USER + '/client/' + assetPath);
        HTTPServer.renderStaticFile(staticFile, req, res, next);
    }


    /** Session **/
    addSessionMessage(req, message) {
        if(typeof req.session.messages === 'undefined')
            req.session.messages = [];
        req.session.messages.push(message)
    }

    popSessionMessage(req) {
        if(typeof req.session.messages === 'undefined' || req.session.messages.length === 0)
            return null;
        return req.session.messages.pop();
    }

    async fetchProfileConfig(database) {
        const configDB = new ConfigDatabase(database);
        const configList = await configDB.selectAllConfigValues();
        const allConfig = configDB.parseConfigValues(configList);
        if(!allConfig.user.profile)
            throw new Error("Profile config is missing");
        return JSON.parse(allConfig.user.profile);
    }


    async updateProfile(req, userID, profile) {
        if(!userID)
            throw new Error("Invalid User ID");
        if(!profile)
            throw new Error("Invalid Profile");

        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = new UserDatabase(database);
        const user = await userDB.fetchUserByID(userID);
        if(!user)
            throw new Error("User not found: " + userID);

        const profileConfig = await this.fetchProfileConfig(database);

        const newProfile = Object.assign({}, user.profile || {});
        for(var i=0; i<profileConfig.length; i++) {
            const profileField = profileConfig[i];
            if(typeof profile[profileField.name] === "undefined")
                continue;
            let value = profile[profileField.name];
            value = encodeHTML(value);
            newProfile[profileField.name] = value;
        }

        return await userDB.updateUser(user.id, null, null, newProfile, null);
        // console.info("SET PROFILE", user, profile);
        // return user;
    }

    async updateFlags(req, userID, flags) {
        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = new UserDatabase(database);
        if(!userID)
            throw new Error("Invalid User ID");
        const user = await userDB.fetchUserByID(userID);
        if(!user)
            throw new Error("User not found: " + userID);
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

        return await userDB.updateUser(user.id, null, null, null, flags);
    }

    async updatePassword(req, userID, password_old, password_new, password_confirm) {
        if(!userID)
            throw new Error("Invalid User ID");
        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = new UserDatabase(database);
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
            // if(password_new === password_old)
            //     throw new Error("New password must be different from the old");
            let matches = await bcrypt.compare(password_old, encryptedPassword);
            if(matches !== true)
                throw new Error("Old password is not correct. Please re-enter");
            matches = await bcrypt.compare(password_new, encryptedPassword);
            if(matches === true)
                throw new Error("New password must be different from the old");
        }

        return await userDB.updateUser(user.id, null, password_new, null, null);
    }

    async register(req, username, email, password, password_confirm) {
        username = UserAPI.sanitizeInput(username, 'username');
        email = UserAPI.sanitizeInput(email, 'email');

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

        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = new UserDatabase(database);
        const user = await userDB.createUser(username, email, password);

        await this.login(req, user.id, password);
        return user;
    }

    async configureAdmin(database, hostname) {
        const userDB = new UserDatabase(database);

        return adminUser;

    }

    async login(req, userID, password, saveSession=false) {
        if(!userID)
            throw new Error("Username or Email is required");
        // if(!UserAPI.validateEmail(userID))
        //     throw new Error("Email format is invalid");

        if(!password)
            throw new Error("Password is required");

        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = new UserDatabase(database);
        const sessionUser = await userDB.fetchUserByID(userID, 'u.*');
        if(!sessionUser)
            throw new Error("User not found: " + userID);
        const encryptedPassword = sessionUser.password;
        delete sessionUser.password;

        const matches = await bcrypt.compare(password, encryptedPassword);
        if(matches !== true)
            throw new Error("Incorrect Password");

        // sets a cookie with the user's info
        req.session.reset();
        req.session.userID = sessionUser.id;

        if(saveSession) {
            req.session.setDuration(1000 * 60 * 60 * 24 * 14) // 2 weeks;
        }

        const activeTasks = await TaskAPI.getActiveTasks(req, database, sessionUser);
        const activeTaskList = Object.values(activeTasks);
        let activeTaskHTML = '';
        if(activeTaskList.length > 0)
            activeTaskHTML = `<br/><a href=":task">You have ${activeTaskList.length} available task${activeTaskList.length > 1 ? 's' : ''}</a>`;
        this.addSessionMessage(req,`<div class='success'>Login Successful: ${sessionUser.username}${activeTaskHTML}</div>`);

        return sessionUser;
    }



    async logout(req, res) {
        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = new UserDatabase(database);
        if(req.session.user_session) {
            await userDB.deleteUserSessionByID(req.session.user_session);
        }
        req.session.reset();
        res.clearCookie('session_save');
        this.addSessionMessage(req,`<div class='success'>User has been logged out</div>`);
        // TODO: destroy db session
    }


    async handleLoginRequest(req, res, next) {
        try {
            if(req.method === 'GET') {
                const userID = UserAPI.sanitizeInput(req.query.userID || null, 'email');
                // Render Editor Form
                await ThemeAPI.send(req, res, `
<script src="/:user/:client/user-login.element.js"></script>
<user-loginform${userID ? ` userID='${userID}'` : ''}></user-loginform>`);

            } else {
                // Handle Form (POST) Request
                // console.log("Log in Request", req.body);
                const user = await this.login(req, req.body.userID, req.body.password, req.body.session_save);

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
                await ThemeAPI.send(req, res, `
<script src="/:user/:client/user-logout.element.js"></script>
<user-logoutform></user-logoutform>`);

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
                await ThemeAPI.send(req, res, `
<script src="/:user/:client/user-register.element.js"></script>
<user-registerform></user-registerform>`);

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

    async sendResetPasswordRequestEmail(req, user) {

        const uuid = uuidv4();
        const recoveryUrl = req.protocol + '://' + req.get('host') + `/:user/${user.id}/:resetpassword/${uuid}`;

        this.resetPasswordRequests[uuid] = user.id;
        setTimeout(() => delete this.resetPasswordRequests[uuid], 1000 * 60 * 60); // Delete after 1 hour

        let to = `${user.profile && user.profile.name ? user.profile.name : user.username} <${user.email}>`;

        const mail = new ResetPasswordMail(recoveryUrl, to);
        await mail.send();

        return recoveryUrl;
    }

    async handleForgotPassword(req, res, next) {
        try {
            const userID = UserAPI.sanitizeInput(req.query.userID || null);
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = new UserDatabase(database);
            const user = await userDB.fetchUserByID(userID, 'u.*');
            if(!user)
                return next();

            if(req.method === 'GET') {
                // Render Editor Form
                await ThemeAPI.send(req, res, `
<script src="/:user/:client/user-forgotpassword.element.js"></script>
<user-forgotpasswordform src="${user.url}"></user-forgotpasswordform>`);

            } else {
                // Handle Form (POST) Request
                // console.log("Log in Request", req.body);
                if(!req.body.userID)
                    throw new Error("userID is required");

                await this.sendResetPasswordRequestEmail(req, user);

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

    async handleResetPassword(userID, uuid, req, res) {
        try {

            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = new UserDatabase(database);
            const user = await userDB.fetchUserByID(userID);
            if(!user)
                throw new Error("User was not found: " + userID);


            if(!uuid)
                throw new Error("uuid required");
            if(!this.resetPasswordRequests[uuid])
                throw new Error("Invalid Validation UUID: " + uuid);
            if(this.resetPasswordRequests[uuid] !== user.id)
                throw new Error("Validation UUID Mismatch: " + uuid);

            switch(req.method) {
                case 'GET':
                    // Render Editor Form
                    await ThemeAPI.send(req, res, `
<script src="/:user/:client/user-resetpassword.element.js"></script>
<user-resetpasswordform uuid="${uuid}" src="${user.url}"></user-resetpasswordform>`);
                    break;

                case 'OPTIONS':
                    const response = {user};
                    // response.profileConfig = await this.fetchProfileConfig(database);
                    res.json(response);
                    break;

                case 'POST':
                    // Handle Form (POST) Request
                    // console.log("Reset Request", req.body);

                    const affectedRows = await this.updatePassword(req,
                        user.id,
                        null,
                        req.body.password_new,
                        req.body.password_confirm);

                    if(!affectedRows)
                        throw new Error("Password not updated");
                    delete this.resetPasswordRequests[uuid];
                    return res.json({
                        redirect: `/:user/:login?userID=${user.username}`,
                        message: `Password has been changed successfully. <br/>Redirecting...`,
                        user
                    });
            }

        } catch (error) {
            console.error(error);
            res.status(400).json({message: "Error: " + error.message, error: error.stack});
        }
    }

    async handleUpdateRequest(type, userID, req, res, next) {
        try {
            userID = UserAPI.sanitizeInput(userID);
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = new UserDatabase(database);
            let user = await userDB.fetchUserByID(userID, 'u.*');
            if(!user)
                return next();

            // const user = await this.userDB.fetchUserByID(userID);
            switch(req.method) {
                case 'GET':
                    if(type === 'edit') {
                        await ThemeAPI.send(req, res, `
<script src="/:user/:client/user-updateprofile.element.js"></script>
<user-updateprofileform src="${user.url}"></user-updateprofileform>
<script src="/:user/:client/user-updatepassword.element.js"></script>
<user-updatepasswordform src="${user.url}"></user-updatepasswordform>
<script src="/:user/:client/user-updateflags.element.js"></script>
<user-updateflagsform src="${user.url}"></user-updateflagsform>`);
                    } else {
                        await ThemeAPI.send(req, res, `
<script src="/:user/:client/user-${type}.element.js"></script>
<user-${type}form src="${user.url}"></user-${type}form>`);
                    }
                    break;

                case 'OPTIONS':
                    const response = {user, sessionUser: null, editable: false};
                    if (req.session && req.session.userID) {
                        const sessionUser = await userDB.fetchUserByID(req.session.userID);

                        switch(type) {
                            case 'updateflags':
                                response.editable = (sessionUser.isAdmin());
                                break;
                            case 'updatepassword':
                                response.require_old_password = user.id === sessionUser.id;
                                response.editable = (sessionUser.isAdmin() || sessionUser.id === user.id);
                                break;
                            case 'profile':
                            case 'updateprofile':
                            default:
                                response.editable = (sessionUser.isAdmin() || sessionUser.id === user.id);
                                break;
                        }
                    }

                    response.profileConfig = await this.fetchProfileConfig(database);

                    res.json(response);

                    break;

                case 'POST':
                    if(!req.session || !req.session.userID)
                        throw new Error("Must be logged in");

                    const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
                    if(!sessionUser)
                        throw new Error("Session User Not Found: " + req.session.userID);
                    if(!sessionUser.isAdmin() && sessionUser.id !== user.id)
                        throw new Error("Not authorized");


                    // Handle Form (POST) Request
                    console.log(`Update ${type} request`, req.body);
                    let affectedRows = -1;
                    switch(type) {
                        case 'updateprofile':
                            affectedRows = await this.updateProfile(req, user.id, req.body);
                            break;
                        case 'updateflags':
                            if(!sessionUser.isAdmin())
                                throw new Error("Not authorized");
                            affectedRows = await this.updateFlags(req, user.id, req.body);
                            break;
                        case 'updatepassword':
                            affectedRows = await this.updatePassword(req,
                                user.id,
                                sessionUser.isAdmin() && sessionUser.id !== user.id ? null : req.body.password_old,
                                req.body.password_new,
                                req.body.password_confirm);
                            break;
                        default:
                            throw new Error("Invalid Profile Request: " + type);
                    }
                    user = await userDB.fetchUserByID(user.id);

                    return res.json({
                        redirect: user.url, // `/:user/${user.id}`,
                        message: `User updated successfully (${type}): ${user.email}. Redirecting...`,
                        user,
                        affectedRows
                    });
            }
        } catch (error) {
            console.error(error);
            res.status(400).json({message: "Error: " + error.message, error: error.stack});
        }
    }

    async handleBrowserRequest(req, res) {
        try {

            if (req.method === 'GET') {
                await ThemeAPI.send(req, res, `
<section>
    <script src="/:user/:client/user-browser.element.js"></script>
    <user-browser></user-browser>
</section>
`);
            // <script src="/:user/:client/user-add.element.js"></script>
            // <user-addform></user-addform>

            } else {
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = new UserDatabase(database);
                // Handle POST
                let whereSQL = '1', values = null;
                if(req.body.search) {
                    whereSQL = 'u.username LIKE ? OR u.email LIKE ? OR u.id = ?';
                    values = ['%'+req.body.search+'%', '%'+req.body.search+'%', parseInt(req.body.search)];
                }
                const users = await userDB.selectUsers(whereSQL, values, 'id, email, username, created, flags');

                return res.json({
                    message: `${users.length} User${users.length !== 1 ? 's' : ''} queried successfully`,
                    users
                });
            }
        } catch (error) {
            console.error(`${req.method} ${req.url}`, error);
            res.status(400);
            if(req.method === 'GET') {
                await ThemeAPI.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
            } else {
                res.json({message: error.stack});
            }
        }

    }


    async getSessionHTML(req, article) {
        let sessionHTML = '';
        if(req.session) {
            while (req.session.messages && req.session.messages.length > 0) {
                const sessionMessage = req.session.messages.pop();
                sessionHTML = `
                    <section class="message">
                        ${sessionMessage}
                    </section>
                    ${sessionHTML}`;
            }
        }
        return sessionHTML;
    }

    async queryAdminEmailAddresses(database=null, hostname=null) {
        let dnsAdminEmails = hostname ? await DNSManager.queryHostAdminEmailAddresses(hostname) : [];
        if(database) {
            const userDB = new UserDatabase(database);
            let adminUsers = await userDB.selectUsers("FIND_IN_SET('admin', u.flags) ORDER BY u.id ASC LIMIT 1 ");
            for(let i=0; i<adminUsers.length; i++) {
                dnsAdminEmails.push(adminUsers[i].email);
            }
        }
        dnsAdminEmails = dnsAdminEmails.filter((value, i, self) => self.indexOf(value) === i)
        return dnsAdminEmails;
    }

    static sanitizeInput(input, type=null) {
        switch(type) {
            case 'username':
                input = (input || '').replace(/[^\w._]/g, '');
                break;
            default:
            case 'email':
                input = (input || '').replace(/[^\w@._]/g, '');
                break;
        }
        return input
    }

    static validateEmail(email) {
        // return email.indexOf('@') !== -1;
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}


module.exports = {UserAPI: new UserAPI()};

function encodeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}