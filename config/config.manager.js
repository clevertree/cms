const { DatabaseManager } = require('../database/database.manager');
const { ServiceManager } = require('../service/service.manager');

class ConfigManager {
    constructor() {
        this.configList = [];

        // Add Site-specific configuration
        const hostname = require('os').hostname().toLowerCase();
        this.setConfigSetting('site.contact', () => 'admin@' + hostname, 'email');
        this.setConfigSetting('site.keywords', () => 'cms, ' + hostname);

        this.setConfigSetting('user.profile', () => JSON.stringify([
            {"name":"name","title":"Full Name"},
            {"name":"description","title":"Description","type":"textarea"}
        ], null, 4), 'json');

    }

    setConfigSetting(name, defaultValue, type=null) {
        let p = this.configList.length;
        for(let i=0; i<this.configList.length; i++) {
            if(this.configList[i].name === name)
                p = i;
                // throw new Error("Config setting already exists: " + name);
        }
        this.configList[p] = {name, defaultValue, type};
    }


    getConfigList() {
        return this.configList.slice();
    }

    async configure(interactive=false) {
        try {
            let promptCallback = interactive === true ? this.prompt : this.autoPrompt;
            await DatabaseManager.configure(promptCallback);
            await ServiceManager.configure(promptCallback);
        } catch (e) {
            console.error("Configuration failed: ", e);
            if(!interactive)
                console.log("Please run $ npm start --configure")
        }
    }

    prompt(text, defaultValue=null, validation=null) {
        var standard_input = process.stdin;
        standard_input.setEncoding('utf-8');
        return new Promise( ( resolve, reject ) => {
            process.stdout.write(text + ` [${(defaultValue === null ? 'null' : defaultValue)}]: `);
            standard_input.on('data', function (data) {
                switch(validation) {
                    default:
                        data = data.trim() || defaultValue;
                        break;
                }
                resolve (data);
            });
        });
    }

    autoPrompt(text, defaultValue=null, validation=null) {
        return defaultValue;
    }


        // var readline = require('readline');
    //
    // var rl = readline.createInterface({
    //     input: process.stdin,
    //     output: process.stdout
    // });
    //
    // rl.stdoutMuted = true;
    //
    // rl.query = "Password : ";
    // rl.question(rl.query, function(password) {
    //     console.log('\nPassword is ' + password);
    //     rl.close();
    // });
    //
    // rl._writeToOutput = function _writeToOutput(stringToWrite) {
    //     if (rl.stdoutMuted)
    //         rl.output.write("\x1B[2K\x1B[200D"+rl.query+"["+((rl.line.length%2==1)?"=-":"-=")+"]");
    //     else
    //         rl.output.write(stringToWrite);
    // };


}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.ConfigManager = new ConfigManager();
