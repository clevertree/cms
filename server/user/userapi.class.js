const bcrypt = require('bcryptjs');

const { UserDatabase } = require('./userdatabase.class');
const { UserSession } = require('./usersession.class');
class UserAPI {
    constructor(app) {
        this.app = app;
    }
    get userDB() { return new UserDatabase(this.app.db); }

    loadRoutes(router) {
        // TODO: handle session_save login
        router.use(async (req, res, next) => await this.checkForSessionLogin(req, res, next));
        // API Routes
        router.get('/:?user/:id(\\d+)/json', async (req, res, next) => await this.handleViewRequest(true, parseInt(req.params.id), req, res, next));
        router.all('/:?user/:id(\\d+)', async (req, res) => await this.handleViewRequest(false, parseInt(req.params.id), req, res));
        router.all('/:?user/:id(\\d+)/profile', async (req, res) => await this.handleProfileRequest(parseInt(req.params.id), req, res));
        router.all('/:?user/login', async (req, res) => await this.handleLoginRequest(req, res));
        router.all('/:?user/session', async (req, res) => await this.handleSessionLoginRequest(req, res));
        router.all('/:?user/logout', async (req, res) => await this.handleLogoutRequest(req, res));
        router.all('/:?user/register', async (req, res) => await this.handleRegisterRequest(req, res));
    }

    async checkForSessionLogin(req, res, next) {
        // console.log(req.session, req.cookies);
        if(!req.session.user && req.cookies.session_save) {
            const session_save = JSON.parse(req.cookies.session_save);
            await this.loginSession(req, res, session_save.uuid, session_save.password);
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

        await this.userDB.updateUser(userID, null, null, user.profile, null);
        // console.info("SET PROFILE", user, profile);
        return user;
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

        const user = await this.userDB.fetchUserByEmail(email);
        if(!user)
            throw new Error("User not found: " + email);

        const matches = await bcrypt.compare(password, user.password);
        if(matches !== true)
            throw new Error("Invalid Password");

        // sets a cookie with the user's info
        req.session.reset();
        req.session.user = {id: user.id};

        if(saveSession) {
            const sessionData = {

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

    async logout(req) {
        req.session.reset();
        new UserSession(req.session).addMessage("User has been logged out");
    }

    async handleViewRequest(asJSON, userID, req, res) {
        try {
            if(!userID)
                throw new Error("Invalid user id");
            const user = await this.userDB.fetchUserByID(userID);
            // Render View
            if(asJSON) {
                const response = {user};
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
                await this.logout(req);

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

    async handleProfileRequest(userID, req, res) {
        try {
            const sessionUser = await new UserSession(req.session).getSessionUser(this.app.db);
            if(!sessionUser)
                throw new Error("Must be logged in");
            if(!sessionUser.isAdmin() && sessionUser.id !== userID)
                throw new Error("Not authorized");
            if(!userID)
                throw new Error("Invalid user id");
            // const user = await this.userDB.fetchUserByID(userID);
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await this.app.getTheme()
                        .render(req, `<%- include("user/section/profile.ejs", {id: ${userID}})%>`)
                );

            } else {
                // Handle Form (POST) Request
                console.log("Profile Update Request", req.body);
                const user = await this.updateProfile(userID, req.body);

                return res.json({
                    // redirect: `/:user/${user.id}`,
                    message: `User profile updated successfully: ${user.email}`,
                    user
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


module.exports = {UserAPI};

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