
class AutoConfig {
    constructor(config={}, promptCallback=false) {
        this.config = config;
        this.promptCallback = promptCallback === true ? this.prompt : promptCallback;
    }

    async get(key) {
        const config = await this.getAll();
        if(typeof this.config[key] === 'undefined')
            throw new Error("Config key not found: " + key);
        return this.config[key];
    }

    async getOrCreate(key) {
        if(typeof this.config[key] === 'undefined')
            this.config[key] = {};
        return this.config[key];
    }

    async getAll() {
        return this.config;
    }

    async promptAndSet(path, text, defaultValue) {
        const globalConfig = await LocalConfigManager.getAll();
        // if(this.promptCallback)
        // this.prompt
    }

    async prompt(text, defaultValue=null) {
        var standard_input = process.stdin;
        standard_input.setEncoding('utf-8');
        return new Promise( ( resolve, reject ) => {
            process.stdout.write(text + ` [${(defaultValue === null ? 'null' : defaultValue)}]: `);
            standard_input.on('data', function (data) {
                data = data.trim() || defaultValue;
                resolve (data);
            });
        });
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

exports.AutoConfig = AutoConfig;
