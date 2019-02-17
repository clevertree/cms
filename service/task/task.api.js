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
        router.get('/[:]task/:taskID/[:]json',        async (req, res) => await this.renderTaskJSON(req.params.taskID || null, req, res));
        router.all('/[:]task(/:taskID)?',             async (req, res) => await this.renderTaskManager(req.params.taskID || null, req, res));
        this.router = router;
    }

    async renderTaskJSON(taskID, req, res) {
        try {
            if(!req.session || !req.session.userID)
                throw new Error("Must be logged in");

            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = await DatabaseManager.getUserDB(database);
            const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;

            const taskList = await TaskManager.getTasks();
            const task = TaskManager.getTask(taskID);
            const htmlForm = await task.renderFormHTML(req, taskID, database, sessionUser);
            const taskData = {
                // taskID: taskID,
                isActive: await task.isActive(database, sessionUser),
                htmlForm: htmlForm.trim()
            };

            return res.json({
                message: `${taskList.length} Task${taskList.length !== 1 ? 's' : ''} available`,
                sessionUser,
                taskData
            });
        } catch (error) {
            console.error(`${req.method} ${req.url}`, error);
            res.status(400);
            return res.json({
                message: `<div class='error'>${error.message || error}</div>`,
                error: error.stack
            });
        }
    }

    async renderTaskManager(taskID, req, res) {
        try {

            if (req.method === 'GET') {

                let activeResponseHTML = '', inactiveResponseHTML = '';
                if (!taskID) {
                    const database = await DatabaseManager.selectDatabaseByRequest(req);
                    const userDB = await DatabaseManager.getUserDB(database);
                    const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;

                    const taskList = await TaskManager.getTasks();
                    for (let currentTaskID = 0; currentTaskID < taskList.length; currentTaskID++) {
                        if (await taskList[currentTaskID].isActive(database, sessionUser))
                            activeResponseHTML += `\n\t<taskform-manager taskID="${currentTaskID}" active="true"></taskform-manager>`;
                        else
                            inactiveResponseHTML += `\n\t<taskform-manager taskID="${currentTaskID}"></taskform-manager>`;
                    }
                } else {
                    activeResponseHTML += `\n\t<taskform-manager taskID="${taskID}" active="true"></taskform-manager>`;
                }

                const responseHTML = `
<section>
    <script src="/service/task/form/taskform-manager.client.js"></script>
    ${activeResponseHTML}
    ${inactiveResponseHTML}
</section>`;

                res.send(
                    await ThemeManager.get()
                        .render(req, responseHTML)
                );

            } else {
                // Handle POST
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = await DatabaseManager.getUserDB(database);
                const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;

                if(typeof req.body.taskID === "undefined")
                    throw new Error("Missing required field: taskID");
                const taskID = parseInt(req.body.taskID);

                const task = await TaskManager.getTask(taskID);
                const responseHTML = await task.handleFormSubmit(req, database, sessionUser)

                return res.json({
                    message: `<div class='success'>${activeTasks.length} Task${activeTasks.length !== 1 ? 's' : ''} updated successfully</div>`,
                    activeTasks
                });
            }
        } catch (error) {
            console.error(`${req.method} ${req.url}`, error);
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

