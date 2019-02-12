const bcrypt = require('bcryptjs');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('client-sessions');
const uuidv4 = require('uuid/v4');

const { LocalConfig } = require('../config/local.config');
const { PromptManager } = require('../config/prompt.manager');
const { DatabaseManager } = require('../database/database.manager');
const { DNSManager } = require('../service/domain/dns.manager');
const { ThemeManager } = require('../theme/theme.manager');
// const { UserDatabase } = require('./user.database');
const { TaskManager } = require('../service/task/task.manager');
const { ResetPasswordEmail } = require("./mail/resetpassword.class");

class UserAPI {
    constructor() {
        this.routerAPI = null;
        this.routerSession = null;
        this.resetPasswordRequests = {
            'aa196dc0-f51f-4a79-a858-53c3b3b03097': 101
        };
    }

    // Configure
    async configure(config=null) {
        const localConfig = new LocalConfig(config, !config);
        const cookieConfig = await localConfig.getOrCreate('cookie');

        const sessionConfig = await localConfig.getOrCreate('session');
        if(!sessionConfig.secret) {
            sessionConfig.secret = require('uuid/v4')();
            await localConfig.saveAll();
        }
        sessionConfig.cookieName = 'session';

        const bodyParser = require('body-parser');

        const routerSession = express.Router();
        routerSession.use(session(sessionConfig));
        routerSession.use(cookieParser(cookieConfig));
        this.routerSession = routerSession;

        const routerAPI = express.Router();
        // TODO: handle session_save login
        // router.use(async (req, res, next) => await this.checkForSessionLogin(req, res, next));
        // API Routes
        routerAPI.use(bodyParser.urlencoded({ extended: true }));
        routerAPI.use(bodyParser.json());
        routerAPI.use(routerSession);

        routerAPI.get('/[:]user/:userID(\\w+)/[:]json',                 async (req, res, next) => await this.handleViewRequest(true, req.params.userID, req, res, next));
        routerAPI.get('/[:]user/:userID(\\w+)',                         async (req, res, next) => await this.handleViewRequest(false, req.params.userID, req, res, next));
        routerAPI.all('/[:]user/:userID(\\w+)/[:]edit',                 async (req, res) => await this.handleUpdateRequest('edit', req.params.userID, req, res));
        routerAPI.all('/[:]user/:userID(\\w+)/[:]profile',              async (req, res) => await this.handleUpdateRequest('profile', req.params.userID, req, res));
        routerAPI.all('/[:]user/:userID(\\w+)/[:]flags',                async (req, res) => await this.handleUpdateRequest('flags', req.params.userID, req, res));
        routerAPI.all('/[:]user/:userID(\\w+)/[:]password',             async (req, res) => await this.handleUpdateRequest('password', req.params.userID, req, res));
        routerAPI.all('/[:]user/:userID(\\w+)/[:]resetpassword/:uuid',  async (req, res) => await this.handleResetPassword(req.params.userID, req.params.uuid, req, res));
        routerAPI.all('/[:]user/[:]login',                              async (req, res) => await this.handleLoginRequest(req, res));
        // router.all('/[:]user/session',                               async (req, res) => await this.handleSessionLoginRequest(req, res));
        routerAPI.all('/[:]user/[:]logout',                             async (req, res) => await this.handleLogoutRequest(req, res));
        routerAPI.all('/[:]user/[:]register',                           async (req, res) => await this.handleRegisterRequest(req, res));
        routerAPI.all('/[:]user/[:]forgotpassword',                     async (req, res) => await this.handleForgotPassword(req, res));
        routerAPI.all('/[:]user(/[:]list)?',                            async (req, res) => await this.handleBrowserRequest(req, res));

        this.routerAPI = routerAPI;
    }

    getSessionMiddleware() {
        if(!this.routerSession)
            this.configure();

        return (req, res, next) => {
            return this.routerSession(req, res, next);
        }
    }

    getMiddleware() {
        if(!this.routerAPI)
            this.configure();

        return (req, res, next) => {
            if(!req.url.startsWith('/:user'))
                return next();
            return this.routerAPI(req, res, next);
        }
    }


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

    async updateProfile(req, userID, profile) {
        if(!userID)
            throw new Error("Invalid User ID");
        if(!profile)
            throw new Error("Invalid Profile");

        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = await DatabaseManager.getUserDB(database);
        const user = await userDB.fetchUserByID(userID);
        if(!user)
            throw new Error("User not found: " + userID);

        const configDB = await DatabaseManager.getConfigDB(database);
        const profileConfig = JSON.parse(await configDB.fetchConfigValue('user.profile'));

        const newProfile = user.profile || {};
        for(var i=0; i<profileConfig.length; i++) {
            const profileField = profileConfig[i];
            if(typeof profile[profileField.name] === "undefined")
                continue;
            let value = profile[profileField.name];
            value = encodeHTML(value);
            newProfile[profileField.name] = value;
        }

        return await userDB.updateUser(userID, null, null, newProfile, null);
        // console.info("SET PROFILE", user, profile);
        // return user;
    }


    async updateFlags(req, userID, flags) {
        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = await DatabaseManager.getUserDB(database);
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
        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = await DatabaseManager.getUserDB(database);
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
        const userDB = await DatabaseManager.getUserDB(database);
        const user = await userDB.createUser(username, email, password);

        await this.login(req, user.id, password);
        return user;
    }

    async configureAdmin(database, hostname, interactive=false) {
        const userDB = await DatabaseManager.getUserDB(database);


        // Find admin user
        let adminUser = await userDB.fetchUser("FIND_IN_SET('admin', u.flags) LIMIT 1");
        if (adminUser) {
            console.info("Admin user found: " + adminUser.id);
            return adminUser;
        }

        // Find admin user by DNS info
        if(!adminUser) {
            console.info("Querying WHOIS for admin email: " + hostname);
            let dnsAdminEmail = await DNSManager.queryDNSAdmin(hostname);
            if (dnsAdminEmail) {
                // dnsAdminEmail.split('@')[0]
                adminUser = await userDB.createUser('admin', dnsAdminEmail, null, 'admin');
                console.info(`Admin user created from DNS info (${adminUser.id}: ` + dnsAdminEmail);
                // TODO: send email;
            }
        }

        if(!adminUser && interactive) {
            // Insert admin user
            let adminUser = await userDB.fetchUser("FIND_IN_SET('admin', u.flags) LIMIT 1");
            if (adminUser) {
                console.info("Admin user found: " + adminUser.id);
            } else {
                for (let i = 0; i < 4; i++) {
                    try {
                        // const hostname = require('os').hostname().toLowerCase();
                        let adminUsername = await PromptManager.prompt(`Please enter an Administrator username`, 'admin');
                        let adminEmail = await PromptManager.prompt(`Please enter an email address for ${adminUsername}`, adminUsername + '@' + hostname);
                        let adminPassword = await PromptManager.prompt(`Please enter a password for ${adminUsername}`, "");
                        let adminPassword2 = await PromptManager.prompt(`Please re-enter a password for ${adminUsername}`, "");
                        if (!adminPassword) {
                            adminPassword = (await bcrypt.genSalt(10)).replace(/\W/g, '').substr(0, 8);
                            adminPassword2 = adminPassword;
                            console.info("Using generated password: " + adminPassword);
                        }
                        if (adminPassword !== adminPassword2) {
                            console.error("Password mismatch");
                            continue;
                        }
                        adminUser = await userDB.createUser(adminUsername, adminEmail, adminPassword, 'admin');
                        console.info(`Admin user created (${adminUser.id}: ` + adminUsername);
                        break;
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        }

        if(adminUser) {
            // Configure site
            const configDB = await DatabaseManager.getConfigDB(database);
            let siteConfig = await configDB.fetchConfigValues('site');

            if (!siteConfig.contact)
                await configDB.updateConfigValue('site.contact', adminUser.email);
        }

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
        const userDB = await DatabaseManager.getUserDB(database);
        const user = await userDB.fetchUserByID(userID, 'u.*');
        if(!user)
            throw new Error("User not found: " + userID);
        const encryptedPassword = user.password;
        delete user.password;

        const matches = await bcrypt.compare(password, encryptedPassword);
        if(matches !== true)
            throw new Error("Incorrect Password");

        // sets a cookie with the user's info
        req.session.reset();
        req.session.userID = user.id;

        if(saveSession) {
            req.session.setDuration(1000 * 60 * 60 * 24 * 14) // 2 weeks;
        }

        this.addSessionMessage(req,`<div class='success'>Login Successful: ${user.username}</div>`);

        return user;
    }

    async logout(req, res) {
        const database = await DatabaseManager.selectDatabaseByRequest(req);
        const userDB = await DatabaseManager.getUserDB(database);
        if(req.session.user_session) {
            await userDB.deleteUserSessionByID(req.session.user_session);
        }
        req.session.reset();
        res.clearCookie('session_save');
        this.addSessionMessage(req,`<div class='success'>User has been logged out</div>`);
        // TODO: destroy db session
    }

    async handleViewRequest(asJSON, userID, req, res) {
        try {
            if(!userID)
                throw new Error("Invalid user id");

            // Render View
            if(asJSON) {
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = await DatabaseManager.getUserDB(database);
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
                if(req.query.getAll || req.query.getProfileConfig) {
                    const configDB = await DatabaseManager.getConfigDB(database);
                    response.profileConfig = JSON.parse(await configDB.fetchConfigValue('user.profile'));
                }
                res.json(response);

            } else {
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<section>
    <script src="/user/element/user-profile.client.js"></script>
    <user-profile id="${userID}"></user-profile>
</section>
`)
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
                        .render(req, `<section class='error'><pre>${error.stack}</pre></section>`)
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
            const userID = UserAPI.sanitizeInput(req.query.userID || null);
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<script src="/user/form/userform-login.client.js"></script>
<userform-login userID="${userID||''}"></userform-login>`)
                );

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
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<script src="/user/form/userform-logout.client.js"></script>
<userform-logout></userform-logout>`)
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
                        .render(req, `
<script src="/user/form/userform-register.client.js"></script>
<userform-register></userform-register>`)
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
                const userID = UserAPI.sanitizeInput(req.query.userID || null);
                // Render Editor Form
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<script src="/user/form/userform-forgotpassword.client.js"></script>
<userform-forgotpassword userID="${userID||''}"></userform-forgotpassword>`)
                );

            } else {
                // Handle Form (POST) Request
                // console.log("Log in Request", req.body);
                if(!req.body.userID)
                    throw new Error("userID is required");
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = await DatabaseManager.getUserDB(database);
                const user = await userDB.fetchUserByID(req.body.userID);
                if(!user)
                    throw new Error("User was not found: " + userID);

                const uuid = uuidv4();
                const recoveryUrl = req.protocol + '://' + req.get('host') + `/:user/${user.id}/:resetpassword/${uuid}`;

                this.resetPasswordRequests[uuid] = user.id;
                setTimeout(() => delete this.resetPasswordRequests[uuid], 1000 * 60 * 60); // Delete after 1 hour

                let to = `${user.profile && user.profile.name ? user.profile.name : user.username} <${user.email}>`;

                const mail = new ResetPasswordEmail(recoveryUrl, to);
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

    async handleResetPassword(userID, uuid, req, res) {
        try {

            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = await DatabaseManager.getUserDB(database);
            const user = await userDB.fetchUserByID(userID);
            if(!user)
                throw new Error("User was not found: " + userID);


            if(!uuid)
                throw new Error("uuid required");
            if(!this.resetPasswordRequests[uuid])
                throw new Error("Invalid Validation UUID: " + uuid);
            if(this.resetPasswordRequests[uuid] !== user.id)
                throw new Error("Validation UUID Mismatch: " + uuid);

            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<script src="/user/form/userform-resetpassword.client.js"></script>
<userform-resetpassword uuid="${uuid}" userID="${userID}" username="${user.username}"></userform-resetpassword>`)
                );

            } else {
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
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = await DatabaseManager.getUserDB(database);
            if(!userID)
                throw new Error("Invalid user id");
            // const user = await this.userDB.fetchUserByID(userID);
            if(req.method === 'GET') {
                // Render Editor Form
                if(type === 'edit') {
                    res.send(
                        await ThemeManager.get()
                            .render(req, `
<script src="/user/form/userform-update-profile.client.js"></script>
<userform-update-profile userID="${userID}"></userform-update-profile>
<script src="/user/form/userform-update-password.client.js"></script>
<userform-update-password userID="${userID}"></userform-update-password>
<script src="/user/form/userform-update-flags.client.js"></script>
<userform-update-flags userID="${userID}"></userform-update-flags>`)
                    );
                } else {
                    res.send(
                        await ThemeManager.get()
                            .render(req, `
<script src="/user/form/userform-update-${type}.client.js"></script>
<userform-update-${type} userID="${userID}"></userform-update-${type}>`)
                    );
                }

            } else {
                let user = await userDB.fetchUserByID(userID);

                if(!req.session || !req.session.userID)
                    throw new Error("Must be logged in");

                const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
                if(!sessionUser)
                    throw new Error("Session User Not Found: " + req.session.userID);
                if(!sessionUser.isAdmin() && sessionUser.id !== user.id)
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
                        affectedRows = await this.updatePassword(req,
                            userID,
                            sessionUser.isAdmin ? null : req.body.password_old,
                            req.body.password_new,
                            req.body.password_confirm);
                        break;
                    default:
                        throw new Error("Invalid Profile Request: " + type);
                }
                user = await userDB.fetchUserByID(userID);

                return res.json({
                    // redirect: `/:user/${user.id}`,
                    message: `User updated successfully (${type}): ${user.email}`,
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
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<section>
    <script src="/user/form/userform-browser.client.js"></script>
    <userform-browser></userform-browser>
    <script src="/user/form/userform-add.client.js"></script>
    <userform-add></userform-add>
</section>
`)
                );

            } else {
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = await DatabaseManager.getUserDB(database);
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
            console.log(error);
            res.status(400);
            if(req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `<section class='error'><pre>${error.stack}</pre></section>`)
                );
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

    static sanitizeInput(input, type='username') {
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