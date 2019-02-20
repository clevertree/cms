const { HTTPServer } = require('./http/http.server');

class ServiceManager {
    constructor() {
    }

    async configure(interactive=false) {
        await HTTPServer.configure(interactive);
    }
}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.ServiceManager = new ServiceManager();
