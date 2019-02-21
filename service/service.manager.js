const { HTTPServer } = require('./http/http.server');
const { TaskAPI } = require('./task/task.api');
const { SessionAPI } = require('./session/session.api');

class ServiceManager {
    constructor() {
    }

    async configure(promptCallback) {
        await HTTPServer.configure(promptCallback);
        await TaskAPI.configure(promptCallback);
        await SessionAPI.configure(promptCallback);

    }
}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.ServiceManager = new ServiceManager();
