class InteractiveConfig {
    constructor(config={}, interactive=true) {
        if(typeof config !== "object")
            throw new Error("Config must be an object");
        this.interactive = interactive;
        this.config = config;
    }




    async promptValue(path, text, defaultValue=null, validation=null) {
        if(!Array.isArray(path))
            path = path.split('.');
        const lastPath = path.pop();
        let target = this.config;
        for(let i=0; i<path.length; i++) {
            if(typeof target[path[i]] === "undefined")
                target[path[i]] = {};
            if(typeof target[path[i]] !== "object")
                throw new Error("Invalid path: " + path.join('.'));
            target = target[path[i]];
        }
        if(typeof target[lastPath] !== "undefined")
            defaultValue = target[lastPath];
        const value = await this.prompt(text, defaultValue, validation);
        target[lastPath] = value;
        // if(this.saveLocal)
        //     await this.saveAll();
        return value;
    }



    prompt(promptText, defaultValue=null, validation=null) {
        if(!this.interactive)
            return defaultValue;
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


}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.InteractiveConfig = InteractiveConfig;
