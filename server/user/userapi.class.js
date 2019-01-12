const { UserDatabase } = require('./userdatabase.class');
const { UserSession } = require('./usersession.class');
class UserAPI {
    constructor(app) {
        this.app = app;
    }
    get userDB() { return new UserDatabase(this.app.db); }

    loadRoutes(router) {
        // API Routes
        router.all('/:?user/login', async (req, res) => await this.handleLoginRequest(req, res));
        router.all('/:?user/logout', async (req, res) => await this.handleLogoutRequest(req, res));
        router.all('/:?user/register', async (req, res) => await this.handleRegisterRequest(req, res));

        // TODO: get json :user
    }

    async register(session, email, password, confirm_password) {
        if(!email)
            throw new Error("Email is required");
        if(!UserAPI.validateEmail(email))
            throw new Error("Email format is invalid");

        if(!password)
            throw new Error("Password is required");

        if(password !== confirm_password && confirm_password !== null)
            throw new Error("Confirm & Password do not match");

        const user = await this.userDB.createUser(email, password);

        // sets a cookie with the user's info
        session.reset();
        session.user = {id: user.id};
        return user;
    }

    async login(session, email, password) {
        if(!email)
            throw new Error("Email is required");
        if(!UserAPI.validateEmail(email))
            throw new Error("Email format is invalid");

        if(!password)
            throw new Error("Password is required");

        const user = await this.userDB.findUserByEmail(email);
        if(!user)
            throw new Error("User not found: " + email);

        const matches = await bcrypt.compare(password, user.password);
        if(matches !== true)
            throw new Error("Invalid Password");

        // sets a cookie with the user's info
        session.reset();
        session.user = {id: user.id};
        return user;
    }

    async logout(session) {
        session.reset();
    }

    async handleLoginRequest(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await this.app.getTheme()
                        .render(req, `
                            <script src="/server/user/form/userform.client.js"></script>
                            <userform-login></userform-login>
                        `)
                );

            } else {
                // Handle Form (POST) Request
                console.log("Log in Request", req.body);
                const user = await this.login(req.session, req.body.email, req.body.password);

                return res.json({
                    redirect: '/:user/' + user.id,
                    message: `User logged in successfully: ${user.email}. Redirecting...`,
                    user
                });
            }
        } catch (error) {
            res.status(400).json({message: error.message, error: error.stack});
        }
    }

    async handleLogoutRequest(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await this.app.getTheme()
                        .render(req, `
                            <script src="/server/user/form/userform.client.js"></script>
                            <userform-login></userform-login>
                        `)
                );

            } else {
                // Handle Form (POST) Request
                console.log("Log out Request", req.body);
                const user = await this.logout(req.session);

                return res.json({
                    redirect: '/:user/' + user.id,
                    message: `User logged out successfully: ${user.email}. Redirecting...`,
                    user
                });
            }
        } catch (error) {
            res.status(400).json({message: error.message, error: error.stack});
        }
    }

    async handleRegisterRequest(req, res) {
        try {
            if(req.method === 'GET') {
                // Render Editor Form
                res.send(
                    await this.app.getTheme()
                        .render(req, `
                            <script src="/server/user/form/userform.client.js"></script>
                            <userform-register></userform-register>
                        `)
                );

            } else {
                // Handle Form (POST) Request
                console.log("Registration Request", req.body);
                const user = await this.register(req.session, req.body.email, req.body.password, req.body.confirm_password);

                return res.json({
                    redirect: '/:user/' + user.id,
                    message: `User registered successfully: ${user.email}. Redirecting...`,
                    user
                });
            }
        } catch (error) {
            res.status(400).json({message: error.message, error: error.stack});
        }
    }

    static validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}


module.exports = {UserAPI};


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