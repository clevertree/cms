const { DatabaseManager } = require('../database/database.manager');
const { HTTPServer } = require('../http/http.server');
const { TaskAPI } = require('../task/task.api');
const { SessionAPI } = require('../user/session/session.api');
const { MailServer } = require('../mail/mail.server');

class ConfigManager {
    constructor() {
        this.configured = false;

    }


    async autoConfigure() {
        if(this.configured === false) {
            this.configured = null;
            await this.configure(false);
        }
    }

    async configure(interactive=false) {
        let config = null;
        try {
            this.configured = null;
            let promptCallback = this.autoPrompt;
            if(interactive === true)
                promptCallback = this.prompt;
            else if(typeof interactive === 'object') {
                promptCallback = null;
                config = interactive;
            }
            await DatabaseManager.configure(config, promptCallback);
            await SessionAPI.configure(config, promptCallback);
            await HTTPServer.configure(config, promptCallback);
            await TaskAPI.configure(config, promptCallback);
            // await ThemeAPI.configure(promptCallback);
            await MailServer.configure(config, promptCallback);
            this.configured = true;
        } catch (e) {
            console.error("Configuration failed: ", e);
            if(!config) {
                if (!interactive)
                    console.warn("Please run $ npm start --configure")
            } else {
                console.warn("Auto configuration failed.")
            }
        }
    }


    prompt(promptText, defaultValue=null, validation=null) {
        return new Promise( ( resolve, reject ) => {

            var readline = require('readline');

            var rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            switch(validation) {
                case 'boolean':
                    promptText += ` [${(defaultValue ? 'y' : 'n')}]: `;
                    break;
                default:
                    promptText += ` [${(defaultValue === null ? 'null' : defaultValue)}]: `;
            }

            rl.query = promptText;
            rl.question(rl.query, function(value) {
                rl.close();
                value = value.trim() || defaultValue;
                switch(validation) {
                    case 'boolean':
                        value = ['y', 'Y', '1', true].indexOf(value) !== -1;
                        break;
                }
                resolve(value);
            });

            rl._writeToOutput = function _writeToOutput(stringToWrite) {
                switch(validation) {
                    case 'password':
                        rl.output.write("\x1B[2K\x1B[200D"+rl.query+"["+((rl.line.length%2==1)?"=-":"-=")+"]");
                        break;
                    default:
                        rl.output.write(stringToWrite);
                }
            };

        });
    }

    autoPrompt(text, defaultValue=null, validation=null) {
        return defaultValue;
    }

}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.ConfigManager = new ConfigManager();
