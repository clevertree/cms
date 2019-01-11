const { UserDatabase, UserEntry } = require('./database.js');

class UserAPI {
    constructor(app) {
        this.app = app;
    }
    get userDB() { return new UserDatabase(this.app.db); }

    loadRoutes(router) {
        // API Routes
        router.post('/:?user/login', async (req, res) => await this.login(req, res));
        router.post('/:?user/logout', async (req, res) => await this.logout(req, res));
        router.post('/:?user/register', async (req, res) => await this.register(req, res));

        // TODO: get json :user
    }


    async login(req, res) {
        let response = {
            redirect: '/:login',
            message: "Login Form",
            status: 200,
        };

        try {
            if(req.method === 'GET') {
                // Handle GET Request
                if(!isJSON(req)) {
                    // Render Editor
                    res.send(
                        await this.app.getTheme()
                            .render(req, `
                                <script src="/client/form/user-form/user-login-form.client.js"></script>
                                <user-login-form></user-login-form>
                            `)
                    );
                }

                // TODO: fetch additional form data
            } else {
                // Handle POST Request


                console.log("Login Request", req.body);

                if(!req.body.email)
                    throw new Error("Email is required");
                if(!UserAPI.validateEmail(req.body.email))
                    throw new Error("Email format is invalid");

                if(!req.body.password)
                    throw new Error("Password is required");

                const user = await this.userDB.findUserByEmail(req.body.email);
                if(!user)
                    throw new Error("User not found: " + req.body.email);

                const matches = await bcrypt.compare(req.body.password, user.password);
                if(error)
                    throw new Error(error.message || error);
                if(matches !== true)
                    throw new Error("Invalid Password");
                // sets a cookie with the user's info
                req.session.reset();
                req.session.user = {id: user.id};

                response.message = `User logged in successfully: ${user.email}. Redirecting...`;
                response.redirect = '/:user/' + user.id;

            }
        } catch (error) {
            response.message = error.stack;
            response.status = 400;
        }

        sendResponse(response, req, res);
    }


    async logout(req, res) {
        let response = {
            redirect: '/:logout',
            message: "Logout Form",
            status: 200,
        };

        try {
            if(req.method === 'GET') {
                // Handle GET Request
                if(!isJSON(req)) {
                    // Render Editor
                    res.send(
                        await this.app.getTheme()
                            .render(req, `
                                <script src="/client/form/user-form/user-login-form.client.js"></script>
                                <user-login-form></user-login-form>
                            `)
                    );
                }

                // TODO: fetch additional form data
            } else {
                // Handle POST Request

                req.session.reset();

                response.message = `User logged out successfully: ${user.email}. Redirecting...`;
                response.redirect = '/:user/' + user.id;

            }
        } catch (error) {
            response.message = error.stack;
            response.status = 400;
        }

        sendResponse(response, req, res);
    }

    async register(req, res) {
        console.log("Registration Request", req.body);

        if(!req.body.email)
            throw new Error("Email is required");
        if(!UserManager.validateEmail(req.body.email))
            throw new Error("Email format is invalid");

        if(!req.body.password)
            throw new Error("Password is required");

        if(req.body.password !== req.body.confirm_password)
            throw new Error("Confirm & Password do not match");

        this.userDB.createUser(req.body.email, req.body.password, (error, user) => {
            if(error)
                throw new Error(error.message || error);

            req.session.reset();
            req.session.user = {id: user.id};

            return res.sendAPIResponse(`User created successfully: ${user.email}. Redirecting...`, '/account');
        });
    }

    static validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}


module.exports = {UserAPI};


function isJSON(req) {
    return req.headers.accept.split(',').indexOf('application/json') !== -1;
}
function sendResponse(response, req, res) {
    res.status(response.status);
    if(isJSON(req)) {
        res.json(response);
    } else {
        new UserSession(req.session).addMessage(response.message);
        res.redirect(response.redirect);
    }
}