// TODO: approve all drafts
const { DatabaseManager } = require('../../database/database.manager');
const { AdminConfigureTask } = require('../../user/task/admin-configure.task');
const { UserDatabase } = require("../../user/user.database");

class TaskManager {
    constructor() {
        this.tasks = null;
    }

    async configure() {
        this.tasks = [];
        await this.addTask(new AdminConfigureTask);
    }

    async addTask(task) {
        this.tasks.push(task);
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

            if(typeof req.session.messages === 'undefined')
                req.session.messages = [];
            req.session.messages.push(`
                <div class='message'>
                    <a href=":task">You have ${activeTaskIDs.length} pending task${activeTaskIDs.length > 1 ? 's' : ''}</a>
                </div>`);
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

exports.TaskManager = new TaskManager();