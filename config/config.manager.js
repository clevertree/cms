const { DatabaseManager } = require('../database/database.manager');
const { HTTPServer } = require('../server/http.server');
const { TaskAPI } = require('../task/task.api');
const { SessionAPI } = require('../user/session/session.api');
const { MailServer } = require('../mail/mail.server');

class ConfigManager {
    constructor() {
    }


    async configure(config=null) {
        if(!config && process && process.argv && process.argv.indexOf('--configure') !== -1) {
            return await this.configureInteractive();
        }

        try {
            await DatabaseManager.configure(config);
            await SessionAPI.configure(config);
            await HTTPServer.configure(config);
            await TaskAPI.configure(config);
            await MailServer.configure(config);
        } catch (e) {
            console.error("Automatic configuration failed: ", e);
            if(!config) {
                console.warn("Please run $ npm start --configure")
            }
        }
    }

    async configureInteractive() {
        try {
            console.log("Starting interactive configuration");
            await DatabaseManager.configureInteractive();
            await SessionAPI.configureInteractive();
            await HTTPServer.configureInteractive();
            await TaskAPI.configureInteractive();
            await MailServer.configureInteractive();
        } catch (e) {
            console.error("Interactive configuration failed: ", e);
        }
    }


}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.ConfigManager = new ConfigManager();
