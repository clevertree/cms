const express = require('express');
const path = require('path');

const { HTTPServer } = require('../http/http.server');
const { DatabaseManager } = require('../database/database.manager');
const { ThemeAPI } = require('../theme/theme.api');
// const { UserAPI } = require('../../user/user.api');
const { AdminConfigureTask } = require('../user/task/admin-configure.task');
const { UserDatabase } = require("../user/user.database");
const { SessionAPI } = require('../session/session.api');
// TODO: approve all drafts

const DIR_TASK = path.resolve(__dirname);

class TaskAPI {
    constructor() {
        this.tasks = [];
    }

    async configure(promptCallback=null) {
        this.tasks = [];
        await this.addTask('admin-configure', new AdminConfigureTask);
    }


    getMiddleware() {
        // Configure Routes
        const bodyParser = require('body-parser');

        const router = express.Router();
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());
        router.use(SessionAPI.getMiddleware());

        // Handle Task requests
        router.get('/[:]task/:taskID/[:]json',        async (req, res) => await this.renderTaskJSON(req.params.taskID || null, req, res));
        router.all('/[:]task(/:taskID)?',             async (req, res) => await this.renderTaskAPI(req.params.taskID || null, req, res));

        // Task Asset files
        router.get('/[:]task/[:]client/*',                async (req, res, next) => await this.handleTaskStaticFiles(req, res, next));

        return (req, res, next) => {
            if(!req.url.startsWith('/:task'))
                return next();
            return router(req, res, next);
        }
    }

    async handleTaskStaticFiles(req, res, next) {
        const routePrefix = '/:task/:client/';
        if(!req.url.startsWith(routePrefix))
            throw new Error("Invalid Route Prefix: " + req.url);
        const assetPath = req.url.substr(routePrefix.length);

        const staticFile = path.resolve(DIR_TASK + '/client/' + assetPath);
        HTTPServer.renderStaticFile(staticFile, req, res, next);
    }

    async renderTaskJSON(taskID, req, res) {
        try {
            if(!req.session || !req.session.userID)
                throw new Error("Must be logged in");

            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = new UserDatabase(database);
            const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;

            const taskList = await this.getTasks();
            const task = this.getTask(taskID);
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

    async renderTaskAPI(taskID, req, res) {
        try {

            if (req.method === 'GET') {

                let activeResponseHTML = '', inactiveResponseHTML = '';
                if (!taskID) {
                    const database = await DatabaseManager.selectDatabaseByRequest(req);
                    const userDB = new UserDatabase(database);
                    const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;

                    const taskList = await this.getTasks();
                    for (let currentTaskID = 0; currentTaskID < taskList.length; currentTaskID++) {
                        if (await taskList[currentTaskID].isActive(database, sessionUser))
                            activeResponseHTML += `\n\t<task-managerform taskID="${currentTaskID}" active="true"></task-managerform>`;
                        else
                            inactiveResponseHTML += `\n\t<task-managerform taskID="${currentTaskID}"></task-managerform>`;
                    }
                } else {
                    activeResponseHTML += `\n\t<task-managerform taskID="${taskID}" active="true"></task-managerform>`;
                }

                const responseHTML = `
<section>
    <script src="/:task/:client/task-managerform.element.js"></script>
    ${activeResponseHTML}
    ${inactiveResponseHTML}
</section>`;

                res.send(
                    await ThemeAPI.get()
                        .render(req, responseHTML)
                );

            } else {
                // Handle POST
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = new UserDatabase(database);
                const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;

                if(typeof req.body.taskID === "undefined")
                    throw new Error("Missing required field: taskID");
                const taskID = parseInt(req.body.taskID);

                const task = await this.getTask(taskID);
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
                    await ThemeAPI.get()
                        .render(req, `<section class='error'><pre>${error.stack}</pre></section>`)
                );
            } else {
                res.json({message: error.stack});
            }
        }
    }


    async addTask(taskName, taskClass) {
        this.tasks[taskName] = taskClass;
    }

    getTask(taskID) {
        if(typeof this.tasks[taskID] === "undefined")
            throw new Error("Task ID not found: " + taskID);
        return this.tasks[taskID];
    }

    getTasks() {
        return this.tasks.slice();
    }

    async getTaskIDs() {
        const taskIDs = [];
        this.tasks.forEach((task, taskID) => taskIDs.push(taskID));
        return taskIDs;
    }

    async getActiveTaskIDs(req) {
        if (!req.session || !req.session.userID)
            return [];
// TODO: REFACTOR!
        if(typeof req.session.activeTaskIDs === 'undefined') {
            const activeTaskIDs = [];
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = new UserDatabase(database);
            const sessionUser = await userDB.fetchSessionUser(req);
            for (let i = 0; i < this.tasks.length; i++) {
                const task = this.tasks[i];
                if (await task.isActive(database, sessionUser))
                    activeTaskIDs.push(i);
            }
            req.session.activeTaskIDs = activeTaskIDs;
        }
        return req.session.activeTaskIDs;
    }

    async getActiveTasks(req) {
        const activeTasks = await this.getActiveTaskIDs(req);
        return activeTasks.map(taskID => this.getTask(taskID));
    }

    // async getSessionHTML(req) {
    //     let sessionHTML = '';
    //     const activeTaskIDs = await this.getActiveTaskIDs(req);
    //     if(activeTaskIDs.length > 0) {
    //         sessionHTML = `
    //         <section class="message">
    //             <div class='message'>
    //                 <a href=":task">You have ${activeTaskIDs.length} pending task${activeTaskIDs.length > 1 ? 's' : ''}</a>
    //             </div>
    //         </section>
    //         ${sessionHTML}`;
    //     }
    //     return sessionHTML;
    // }
}


module.exports = {TaskAPI: new TaskAPI()};

