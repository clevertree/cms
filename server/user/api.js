const { UserDatabase, UserEntry } = require('./database.js');

class UserAPI {
    constructor(app) {
        this.app = app;
    }
    get userDB() { return new UserDatabase(this.app.db); }

    loadRoutes(router) {
        // API Routes
        router.post('/:?user/login', (req, res) => await this.login(req, res));
        router.post('/:?user/logout', (req, res) => await this.logout(req, res));
        router.post('/:?user/register', (req, res) => await this.register(req, res));

        // TODO: get json :user
    }


    async login(req, res) {
        console.log("Login Request", req.body);

        if(!req.body.email)
            return res.sendAPIError(res, "Email is required");
        if(!UserAPI.validateEmail(req.body.email))
            return res.sendAPIError(res, "Email format is invalid");

        if(!req.body.password)
            return res.sendAPIError(res, "Password is required");

        this.userDB.findUserByEmail(req.body.email, (error, user) => {
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

                return res.sendAPIResponse(`User logged in successfully: ${user.email}. Redirecting...`, '/account');
            });

        });
    }


    async logout(req, res) {
        console.log("Log out Request", req.body);

        // sets a cookie with the user's info
        req.session.reset();
        return res.sendAPIResponse(`User logged out successfully. Redirecting...`, '/login');
    }

    async register(req, res) {
        console.log("Registration Request", req.body);

        if(!req.body.email)
            return res.sendAPIError(res, "Email is required");
        if(!UserManager.validateEmail(req.body.email))
            return res.sendAPIError(res, "Email format is invalid");

        if(!req.body.password)
            return res.sendAPIError(res, "Password is required");

        if(req.body.password !== req.body.confirm_password)
            return res.sendAPIError(res, "Confirm & Password do not match");

        this.userDB.createUser(req.body.email, req.body.password, (error, user) => {
            if(error)
                return res.sendAPIError(res, error.message || error);

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

