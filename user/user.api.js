const bcrypt = require('bcryptjs');
// const cookieParser = require('cookie-parser');
// const session = require('client-sessions');
const uuidv4 = require('uuid/v4');
const path = require('path');

const { DNSManager } = require('../server/dns.manager');

// const { LocalConfig } = require('../config/local.config');
// const { ConfigManager } = require('../config/config.manager');
const { DatabaseManager } = require('../database/database.manager');
// const { ContentAPI } = require('../content/content.api');
const { ContentTable } = require("../content/content.table");
const { UserTable } = require('./user.table');
const { UserMessageTable } = require('./user_message.table');
const { SessionAPI } = require('./session/session.api');
// const { HTTPServer } = require('../server/server.server');

// const { DNSManager } = require('../service/domain/dns.manager');
const { ContentRenderer } = require('../content/content.renderer');
const { TaskAPI } = require('../task/task.api');
const { ResetPasswordMail } = require("./mail/resetpassword.mail");

const DIR_USER = path.resolve(__dirname);

class UserAPI {
    get ContentAPI() { return require('../content/content.api').ContentAPI; }

    constructor() {
        this.resetPasswordRequests = {
            'aa196dc0-f51f-4a79-a858-53c3b3b03097': 101
        };
    }


    getMiddleware() {
        const express = require('express');
        // const interactiveConfig = new InteractiveConfig(config, !config);
        // const cookieConfig = await localConfig.getOrCreate('cookie');

        const sessionConfig = {}; //await localConfig.getOrCreate('session');
        // if(!sessionConfig.secret) {
        //     sessionConfig.secret = require('uuid/v4')();
        //     await localConfig.saveAll();
        // }
        sessionConfig.cookieName = 'session';

        const router = express.Router();
        // TODO: handle session_save login
        // router.use(async (req, res, next) => await this.checkForSessionLogin(req, res, next));
        // API Routes
        router.use(express.urlencoded({ extended: true }));
        router.use(express.json());
        router.use(SessionAPI.getMiddleware());

        router.all('/[:]user/:userID(\\w+)',                        async (req, res, next) => await this.handleUpdateRequest('profile', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]edit',                async (req, res, next) => await this.handleUpdateRequest('edit', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]profile',             async (req, res, next) => await this.handleUpdateRequest('updateprofile', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]flags',               async (req, res, next) => await this.handleUpdateRequest('updateflags', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]password',            async (req, res, next) => await this.handleUpdateRequest('updatepassword', req.params.userID, req, res, next));
        router.all('/[:]user/:userID(\\w+)/[:]resetpassword/:uuid', async (req, res) => await this.handleResetPassword(req.params.userID, req.params.uuid, req, res));
        router.all('/[:]user/[:]login',                             async (req, res) => await this.handleLoginRequest(req, res));
        // router.all('/[:]user/session',                               async (req, res) => await this.handleSessionLoginRequest(req, res));
        router.all('/[:]user/[:]logout',                            async (req, res) => await this.handleLogoutRequest(req, res));
        router.all('/[:]user/[:]register',                          async (req, res) => await this.handleRegisterRequest(req, res));
        router.all('/[:]user/[:]forgotpassword',                    async (req, res, next) => await this.handleForgotPassword(req, res));
        router.all('/[:]user/[:]json',                              async (req, res) => await this.renderUserListJSON(req, res));
        router.all('/[:]user(/[:]list)?',                           async (req, res) => await this.handleUserListRequest(req, res));

        router.all('/[:]user/[:]message/:messageID(\\d+)',          async (req, res, next) => await this.handleMessageRequest(req.params.messageID, req, res));
        router.all('/[:]user/[:]message',                           async (req, res, next) => await this.handleMessageSendRequest(null, req, res));
        router.all('/[:]user/:userID(\\w+)/[:]message',             async (req, res, next) => await this.handleMessageSendRequest(req.params.userID, req, res));

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
        await this.ContentAPI.renderStaticFile(req, res, next, staticFile);
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
        const path = '/config/profile.json';
        const configDB = new ContentTable(database);
        const content = await configDB.fetchContentByPath(path, '*');
        if(!content)
            throw new Error("Profile content not found: " + path);
        const profileConfig = JSON.parse(content.data.toString("UTF8"));
        if(!profileConfig)
            throw new Error("Invalid Config");
        return profileConfig;
    }


    async updateProfile(req, userID, profile) {
        if(!userID)
            throw new Error("Invalid User ID");
        if(!profile)
            throw new Error("Invalid Profile");

        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userTable = new UserTable(database);
        const user = await userTable.fetchUserByKey(userID);
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

        return await userTable.updateUser(user.id, null, null, newProfile, null);
        // console.info("SET PROFILE", user, profile);
        // return user;
    }

    async updateFlags(req, userID, flags) {
        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userTable = new UserTable(database);
        if(!userID)
            throw new Error("Invalid User ID");
        const user = await userTable.fetchUserByKey(userID);
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

        return await userTable.updateUser(user.id, null, null, null, flags);
    }

    async updatePassword(req, userID, password_old, password_new, password_confirm) {
        if(!userID)
            throw new Error("Invalid User ID");
        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userTable = new UserTable(database);
        const user = await userTable.fetchUserByKey(userID, 'u.*');
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

        return await userTable.updateUser(user.id, null, password_new, null, null);
    }

    async register(req, username, email, password, password_confirm) {
        username = this.sanitizeInput(username, 'username');
        email = this.sanitizeInput(email, 'email');

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
        const userTable = new UserTable(database);
        const user = await userTable.createUser(username, email, password);

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

        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userTable = new UserTable(database);
        const sessionUser = await userTable.fetchUserByKey(userID, 'u.*');
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
        const userTable = new UserTable(database);
        if(req.session.user_session) {
            await userTable.deleteUserSessionByID(req.session.user_session);
        }
        req.session.reset();
        res.clearCookie('session_save');
        this.addSessionMessage(req,`<div class='success'>User has been logged out</div>`);
        // TODO: destroy db session
    }


    async handleLoginRequest(req, res, next) {
        try {
            await DatabaseManager.selectDatabaseByRequest(req);
            if(req.method === 'GET') {
                const userID = this.sanitizeInput(req.query.userID || null, 'email');
                // Render Editor Form
                await ContentRenderer.send(req, res, {
                    title: `Log in`,
                    data: `<user-form-login${userID ? ` userID='${userID}'` : ''}></user-form-login>`
                });

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
            await this.renderError(error, req, res);
        }
    }

    async handleLogoutRequest(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                await ContentRenderer.send(req, res, {
                    title: `Log Out`,
                    data: `<user-form-logout></user-form-logout>`
                });

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
            await this.renderError(error, req, res);
        }
    }

    async handleRegisterRequest(req, res) {
        try {
            await DatabaseManager.selectDatabaseByRequest(req);
            if(req.method === 'GET') {
                // Render Editor Form
                await ContentRenderer.send(req, res, {
                    title: `Register`,
                    data: `<user-form-register></user-form-register>`
                });

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
            await this.renderError(error, req, res, {
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

    async handleForgotPassword(req, res) {
        try {
            const userID = this.sanitizeInput(req.query.userID || null, 'email');
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userTable = new UserTable(database);

            switch(req.method) {
                case 'GET':
                // Render Editor Form
                    await ContentRenderer.send(req, res, {
                        title: `Forgot Password`,
                        data: `<user-form-forgotpassword userID="${userID}"></user-form-forgotpassword>`
                    });
                    break;

                default:
                case 'OPTIONS':
                    res.json({});
                    break;

                case 'POST':
                        // Handle Form (POST) Request
                    // console.log("Log in Request", req.body);
                    if(!req.body.userID)
                        throw new Error("userID is required");
                    const user = await userTable.fetchUserByKey(req.body.userID, 'u.*');

                    await this.sendResetPasswordRequestEmail(req, user);

                    return res.json({
                        redirect: `/:user/:login`,
                        message: `Recovery email sent successfully to ${user.email}. <br/>Redirecting...`,
                        user
                    });

            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    async handleResetPassword(userID, uuid, req, res) {
        try {

            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userTable = new UserTable(database);
            const user = await userTable.fetchUserByKey(userID);
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
                    await ContentRenderer.send(req, res, {
                        title: `Reset Password`,
                        data: `<user-form-resetpassword uuid="${uuid}" src="${user.url}"></user-form-resetpassword>`
                    });
                    break;

                default:
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
            await this.renderError(error, req, res);
        }
    }

    async handleUpdateRequest(type, userID, req, res, next) {
        try {
            userID = this.sanitizeInput(userID, 'email');
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userTable = new UserTable(database);
            let user = await userTable.fetchUserByKey(userID, 'u.*');
            if(!user)
                return next();

            // const user = await this.userTable.fetchUserByKey(userID);
            switch(req.method) {
                case 'GET':
                    if(type === 'edit') {
                        await ContentRenderer.send(req, res, {
                            title: `Update Profile`,
                            data: `
<user-form-updateprofile src="${user.url}"></user-form-updateprofile>
<user-form-updatepassword src="${user.url}"></user-form-updatepassword>
<user-form-updateflags src="${user.url}"></user-form-updateflags>
`
                        });
                    } else {
                        await ContentRenderer.send(req, res, {
                            title: `Profile: ${user.username}`,
                            data: `<user-form-${type} src="${user.url}"></user-form-${type}>`
                        });
                    }
                    break;

                default:
                case 'OPTIONS':
                    const response = {user, sessionUser: null, editable: false};
                    if (req.session && req.session.userID) {
                        const sessionUser = await userTable.fetchUserByID(req.session.userID);

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

                    const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;
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
                    user = await userTable.fetchUserByID(user.id);

                    return res.json({
                        redirect: user.url, // `/:user/${user.id}`,
                        message: `User updated successfully (${type}): ${user.email}. Redirecting...`,
                        user,
                        affectedRows
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    async handleUserListRequest(req, res) {
        try {

            switch(req.method) {
                case 'GET':
                    await ContentRenderer.send(req, res, {
                        title: `Browse Users`,
                        data:
                            `<user-form-browser></user-form-browser><user-form-register></user-form-register>`});
                    break;

                case 'OPTIONS':
                case 'POST':
                    return this.renderUserListJSON(req, res);
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async renderUserListJSON(req, res) {
        try {

            return res.json(
                await this.searchUserList(req)
            );
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async searchUserList(req) {

        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userTable = new UserTable(database);

        // Handle POST
        let whereSQL = '1', values = null;
        let search = req.body.search || req.params.search || req.query.search;
        if(search) {
            whereSQL = 'u.username LIKE ? OR u.email LIKE ? OR u.id = ?';
            values = ['%'+search+'%', '%'+search+'%', parseInt(search) || -1];
        }

        let sort = (req.body.sort || req.params.sort || req.query.sort || '').toLowerCase() === 'asc' ? 'ASC' : "DESC";
        let by = req.body.by || req.params.by || req.query.by || 'id';
        switch(by.toLowerCase()) {
            case 'id':
            case 'email':
            case 'username':
            case 'created':
            case 'flags':
                whereSQL += ` ORDER BY ${by} ${sort}`
                break;
        }

        const userList = await userTable.selectUsers(whereSQL, values, 'id, email, username, created, flags');

        return {
            message: `${userList.length} user entr${userList.length !== 1 ? 'ies' : 'y'} queried successfully`,
            userList
        };
    }

    async handleMessageSendRequest(userID, req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userTable = new UserTable(database);
            const userMessageTable = new UserMessageTable(database);

            switch(req.method) {
                case 'GET':
                    await ContentRenderer.send(req, res, {
                        title: `Send a Message`,
                        data: `<user-form-message-send${userID ? ` to="${userID}"` : ''}></user-form-message-send>`});
                    break;

                case 'OPTIONS':
                    const searchJSON = await this.searchUserList(req);
                    searchJSON.message = "Send a message";
                    return res.json(searchJSON);

                case 'POST':
                    // Handle POST
                    const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;

                    // TODO: for loop
                    const toUser = await userTable.fetchUserByKey(req.body.to); // TODO: test match against userID
                    if(!toUser)
                        throw new Error("User not found: " + req.body.to);

                    const from = this.sanitizeInput(req.body.from, 'email') ;
                    const subject = this.sanitizeInput(req.body.subject, 'text') ;
                    let body = this.sanitizeInput(req.body.body, 'text') ;
                    const parent_id = req.body.parent_id ? parseInt(req.body.parent_id) : null;
                    if(from)
                        body = `From: ${from}\n\n` + body;

                    const userMessage = await userMessageTable.insertUserMessage(toUser.id, subject, body, parent_id, sessionUser ? sessionUser.id : null);

                    // TODO: send an email

                    return res.json({
                        redirect: userMessage.url,
                        message: `Message sent to ${toUser.username} successfully. Redirecting...`,
                        insertID: userMessage.id
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }
    async handleMessageRequest(messageID, req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userTable = new UserTable(database);
            const userMessageTable = new UserMessageTable(database);

            switch(req.method) {
                case 'GET':
                    await ContentRenderer.send(req, res, {
                        title: `Message: ${messageID}`,
                        data: `<user-form-message${messageID ? ` messageID="${messageID}"` : ''}></user-form-message-send>`});
                    break;

                case 'OPTIONS':
                    const message = await userMessageTable.fetchUserMessageByID(messageID);;
                    // searchJSON.message = `Message: ${messageID}`;
                    return res.json(message);

                case 'POST':
                    // Handle POST
                    const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;

                    // TODO: Delete Message

                    return res.json({
                        redirect: userMessage.url,
                        message: `Message sent to ${toUser.username} successfully. Redirecting...`,
                        insertID: userMessage.id
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }



    async queryAdminEmailAddresses(database=null, hostname=null) {
        let dnsAdminEmails = hostname ? await DNSManager.queryHostAdminEmailAddresses(hostname) : [];
        if(database) {
            const userTable = new UserTable(database);
            let adminUsers = await userTable.selectUsers("FIND_IN_SET('admin', u.flags) ORDER BY u.id ASC LIMIT 1 ");
            for(let i=0; i<adminUsers.length; i++) {
                dnsAdminEmails.push(adminUsers[i].email);
            }
        }
        dnsAdminEmails = dnsAdminEmails.filter((value, i, self) => self.indexOf(value) === i)
        return dnsAdminEmails;
    }

    async renderError(error, req, res, json=null) {
        console.error(`${req.method} ${req.url}:`, error);
        res.status(400);
        if(error.redirect) {
            res.redirect(error.redirect);
        } else if(req.method === 'GET' && !json) {
            await ContentRenderer.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
        } else {
            res.json(Object.assign({}, {
                message: error.message,
                error: error.stack,
                code: error.code,
            }, json));
        }
    }

    sanitizeInput(input, type=null) {
        switch(type) {
            case 'username':
                input = (input || '').replace(/[^\w._]/g, '');
                break;
            case 'email':
                input = (input || '').replace(/[^\w@._<>'" ]/g, '');
                break;
            default:
            case 'text':
                input=input.replace(/<\w+>/g,'').replace(/<\/\w+>/g,'').trim();
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