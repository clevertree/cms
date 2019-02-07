const express = require('express');

const { DatabaseManager } = require('../database/database.manager');
const { ThemeManager } = require('../theme/theme.manager');
const { ServiceDatabase } = require("./service.database");
const { UserDatabase } = require("../user/user.database");
const { UserAPI } = require('../user/user.api');

class ServiceAPI {
    constructor() {
        this.router = null;
    }


    getMiddleware() {
        if(!this.router)
            this.configure();

        return (req, res, next) => {
            if(!req.url.startsWith('/:service'))
                return next();
            return this.router(req, res, next);
        }
    }

    async configure() {
        // Configure Routes
        const router = express.Router();
        const bodyParser = require('body-parser');
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());
        router.use(UserAPI.getSessionMiddleware());

        // Handle Service requests
        router.get('/[:]service/[:]json',                    async (req, res) => await this.renderServiceJSON(req, res));
        router.all('/[:]service(/[:]edit)?',                 async (req, res) => await this.renderServiceEditor(req, res));
        this.router = router;
    }

    async renderServiceJSON(req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = await DatabaseManager.getUserDB(database);
            const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
            if(!sessionUser || !sessionUser.isAdmin())
                throw new Error("Not authorized");

            return res.json({
                // message: `${serviceList.length} Service${serviceList.length !== 1 ? 's' : ''} queried successfully`,
                // serviceList,
            });
        } catch (error) {
            console.log(error);
            res.status(400);
            return res.json({
                message: `<div class='error'>${error.message || error}</div>`,
                error: error.stack
            });
        }
    }

    async renderServiceEditor(req, res) {
        try {

            if (req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<section>
    <script src="/service/form/serviceform-editor.client.js"></script>
    <serviceform-editor></serviceform-editor>
</section>
`)
                );

            } else {
                // Handle POST
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = await DatabaseManager.getUserDB(database);

                const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
                if(!sessionUser || !sessionUser.isAdmin())
                    throw new Error("Not authorized");

                return res.json({
                    // message: `<div class='success'>${serviceUpdateList.length} Service${serviceUpdateList.length !== 1 ? 's' : ''} updated successfully</div>`,
                    // serviceList
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
}


module.exports = {ServiceAPI: new ServiceAPI()};

