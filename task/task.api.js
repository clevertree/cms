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
        this.taskClass = {};
    }

    async configure(promptCallback=null) {
        this.taskClass = {};
        await this.addTask(require('../user/task/admin-configure.task').AdminConfigureTask);
        await this.addTask(require('../database/task/database-configure.task').DatabaseConfigureTask);
    }


    getMiddleware() {
        // Configure Routes

        const router = express.Router();
        router.use(express.urlencoded({ extended: true }));
        router.use(express.json());
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
            const database = await DatabaseManager.selectDatabaseByRequest(req, false);
            let sessionUser = null;
            if(database) {
                const userDB = new UserDatabase(database);
                sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
            }
            // const task = await this.getTaskClass(taskName);

            switch(req.method) {
                case 'GET':
                    await ThemeAPI.send(req, res, `<section>
        <script src="/:task/:client/task-manager.element.js"></script>
        <task-manager ${taskName ? `taskName="${taskName}"` : ''}></task-manager>
    </section>`);
                    break;

                default:
                case 'OPTIONS':
                    // if(!sessionUser)
                    //     throw new Error("Must be logged in");

// render all forms to minimize user interaction, organize by priority value
                    let taskForms = {};
                    let taskCount = 0;
                    if (!taskName) {
                        const activeTasks = await this.getActiveTasks(req, database, sessionUser);
                        for(let taskName in activeTasks) {
                            if(activeTasks.hasOwnProperty(taskName)) {
                                const task = activeTasks[taskName];
                                taskForms[taskName] = await task.renderFormHTML(req, sessionUser);
                                taskCount++;
                            }
                        }
                    } else {
                        const task = this.getTask(taskName, database);
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
                    const task = this.getTask(taskName, database);
                    // await task.handleFormSubmit(req, sessionUser);
                    const resultTaskForm = await task.renderFormHTML(req, sessionUser); // Task should handle POST

                    return res.json({
                        message: `<div class='success'>Task '${taskName}' has been run successfully</div>`,
                        result: {
                            updatedTaskName: taskName,
                            taskForm: resultTaskForm
                        }
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }


    async addTask(taskClass) {
        let taskName = taskClass.toString();
        if(taskClass.getTaskName)
            taskName = taskClass.getTaskName();
        if(typeof this.taskClass[taskName] !== "undefined")
            throw new Error("Task entry already exists: " + taskName);
        this.taskClass[taskName] = taskClass;
    }

    getTaskClass(taskName) {
        if(typeof this.taskClass[taskName] === "undefined")
            throw new Error("Task Name not found: " + taskName);
        return this.taskClass[taskName];
    }

    getTask(taskName, database) {
        const task = this.getTaskClass(taskName);
        return new task(database);
    }

    getTasks() { return Object.values(this.taskClass); }

    async getActiveTasks(req, database, sessionUser=null) {
        const activeTasks = {};
        for(const taskName in this.taskClass) {
            if(this.taskClass.hasOwnProperty(taskName)) {
                const task = this.getTask(taskName, database);
                if(await task.isActive(req, sessionUser)) {
                    activeTasks[taskName] = task;
                }
            }
        }
        return activeTasks;
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

    async renderError(error, req, res, json=null) {
        console.error(`${req.method} ${req.url} ${error.message}`);
        res.status(400);
        if(error.redirect) {
            res.redirect(error.redirect);
        } else if(req.method === 'GET' && !json) {
            await ThemeAPI.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
        } else {
            res.json(Object.assign({}, {
                message: error.message,
                error: error.stack,
                code: error.code,
            }, json));
        }
    }
}


module.exports = {TaskAPI: new TaskAPI()};

