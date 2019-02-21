const { HTTPServer } = require('./http/http.server');

class ServiceManager {
    constructor() {
    }

    async configure(promptCallback) {
        await HTTPServer.configure(promptCallback);
    }
}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.ServiceManager = new ServiceManager();
