const express = require('express');
const path = require('path');

const { HTTPServer } = require('../http/http.server');
const { DatabaseManager } = require('../database/database.manager');
const { ThemeAPI } = require('../theme/theme.api');
// const { UserAPI } = require('../../user/user.api');
const { UserDatabase } = require("../user/user.database");
const { SessionAPI } = require('../session/session.api');
// TODO: approve all drafts

const DIR_TASK = path.resolve(__dirname);

class TaskAPI {
    constructor() {
        this.tasks = {};
    }

    async configure(promptCallback=null) {
        this.tasks = {};
        await this.addTask('admin-configure', require('../user/task/admin-configure.task').AdminConfigureTask);
    }


    getMiddleware() {
        // Configure Routes
        const bodyParser = require('body-parser');

        const router = express.Router();
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());
        router.use(SessionAPI.getMiddleware());

        // Handle Task requests
        // router.get('/[:]task/:taskName/[:]json',        async (req, res) => await this.renderTaskJSON(req.params.taskName || null, req, res));
        router.all('/[:]task(/:taskName)?',             async (req, res) => await this.renderTaskManager(req.params.taskName || null, req, res));

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


    async renderTaskManager(taskName, req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = new UserDatabase(database);
            const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;

            // const task = await this.getTask(taskName);

            switch(req.method) {
                case 'GET':
                    res.send(
                        await ThemeAPI.get()
                            .render(req, `<section>
        <script src="/:task/:client/task-manager.element.js"></script>
        <task-manager ${taskName ? `taskName="${taskName}` : ''}></task-manager>
    </section>`)
                    );
                    break;

                case 'OPTIONS':
                    if(!sessionUser)
                        throw new Error("Must be logged in");

// render all forms to minimize user interaction, organize by priority value
                    let taskForms = {};
                    let taskCount = 0;
                    if (!taskName) {
                        for(let taskName in this.tasks) {
                            if(this.tasks.hasOwnProperty(taskName)) {
                                const taskClass = this.tasks[taskName];
                                const task = new taskClass(taskName, database);
                                if (await task.isActive(sessionUser)) {
                                    taskForms[taskName] = await task.renderFormHTML(req, sessionUser);
                                    taskCount++;
                                } else {
                                    // inactiveResponseHTML += `\n\t<task-managerform taskName="${taskName}"></task-managerform>`;
                                }
                            }
                        }
                    } else {
                        if(!this.tasks[taskName])
                            throw new Error("Task not found: " + taskName);
                        const taskClass = this.tasks[taskName];
                        const task = new taskClass(taskName, database);
                        taskForms[taskName] = await task.renderFormHTML(req, sessionUser);
                        taskCount++;
                    }

                    return res.json({
                        message: `${taskCount} Task${taskCount !== 1 ? 's' : ''} available`,
                        sessionUser,
                        taskForms
                    });

                case 'POST':
                    // Handle POST

                    // if(typeof req.body.taskName === "undefined")
                    //     throw new Error("Missing required field: taskName");
                    // const taskName = parseInt(req.body.taskName);

                    if(!taskName)
                        throw new Error("Missing required field: taskName");
                    if(!this.tasks[taskName])
                        throw new Error("Task not found: " + taskName);
                    const taskClass = this.tasks[taskName];
                    const task = new taskClass(taskName, database);
                    await task.handleFormSubmit(req, sessionUser);
                    const resultTaskForm = await task.renderFormHTML(req, sessionUser);

                    return res.json({
                        message: `<div class='success'>Task '${taskName}' has been run successfully</div>`,
                        result: {
                            taskName,
                            taskForm: resultTaskForm
                        }
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
        if(typeof this.tasks[taskName] !== "undefined")
            throw new Error("Task entry already exists: " + taskName);
        this.tasks[taskName] = taskClass;
    }

    getTask(taskName) {
        if(typeof this.tasks[taskName] === "undefined")
            throw new Error("Task ID not found: " + taskName);
        return this.tasks[taskName];
    }


    // async getTaskIDs() {
    //     const taskNames = [];
    //     this.tasks.forEach((task, taskName) => taskNames.push(taskName));
    //     return taskNames;
    // }

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
        return activeTasks.map(taskName => this.getTask(taskName));
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

