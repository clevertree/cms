// TODO: approve all drafts
const { AdminConfigureTask } = require('../../user/task/admin-configure.task');
const { DatabaseManager } = require('../../database/database.manager');

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

    async getActiveTasks(database, user) {
        const activeTasks = [];
        for(let i=0; i<this.tasks.length; i++) {
            const task = this.tasks[i];
            if(await task.isActive(database, user))
                activeTasks.push(task);
        }
        return activeTasks;
    }
}

exports.TaskManager = new TaskManager();