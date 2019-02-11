const express = require('express');

const { DatabaseManager } = require('../../database/database.manager');
const { ThemeManager } = require('../../theme/theme.manager');
const { UserAPI } = require('../../user/user.api');
const { TaskManager } = require('./task.manager');

class TaskAPI {
    constructor() {
        this.router = null;
    }


    getMiddleware() {
        if(!this.router)
            this.configure();

        return (req, res, next) => {
            if(!req.url.startsWith('/:task'))
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

        // Handle Task requests
        router.get('/[:]task/[:]json',                  async (req, res) => await this.renderTaskJSON(req, res));
        router.all('/[:]task(/[:]manage)?',             async (req, res) => await this.renderTaskManager(req, res));
        this.router = router;
    }

    async renderTaskJSON(req, res) {
        try {
            if(!req.session || !req.session.userID)
                throw new Error("Must be logged in");

            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = await DatabaseManager.getUserDB(database);
            const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;

            const activeTasks = await TaskManager.getActiveTasks(database, sessionUser);

            return res.json({
                message: `${activeTasks.length} Task${activeTasks.length !== 1 ? 's' : ''} available`,
                sessionUser,
                activeTasks
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

    async renderTaskManager(req, res) {
        try {

            if (req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<section>
    <script src="/service/task/form/taskform-editor.client.js"></script>
    <taskform-editor></taskform-editor>
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

                const activeTasks = await TaskManager.getActiveTasks(database, sessionUser);

                return res.json({
                    message: `<div class='success'>${activeTasks.length} Task${activeTasks.length !== 1 ? 's' : ''} updated successfully</div>`,
                    activeTasks
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


module.exports = {TaskAPI: new TaskAPI()};

