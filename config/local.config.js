const path = require('path');
const fs = require('fs');

// const { FileManager } = require('../file/file.manager');
// const { ConfigManager } = require('./config.manager');promptCallback

const BASE_DIR = path.resolve(path.dirname(__dirname));

// Missing database config always prompts. --configure forces all config options
class LocalConfig {
    constructor(promptCallback) {
        this.promptCallback = promptCallback || function(text, defaultValue) { return defaultValue; };
        this.config = null;
        // if(config) {
        //     if(typeof config !== 'object')
        //         throw new Error("Config must be an object");
        //     this.config = config;
        // }
        // this.saveLocal = saveLocal;
    }

    async has(key) {
        const config = await this.getAll();
        return (typeof config[key] === 'undefined')
    }

    async get(key) {
        const config = await this.getAll();
        if(typeof config[key] === 'undefined')
            throw new Error("Config key not found: " + key);
        return config[key];
    }

    async getOrCreate(key) {
        const config = await this.getAll();
        if(typeof config[key] === 'undefined')
            config[key] = {};
        return config[key];
    }

    async getAll() {
        if(!this.config) {
            const configPath = path.resolve(BASE_DIR + '/.config.json');
            if (await this.accessAsync(configPath)) {
                const configJSON = await this.readFileAsync(configPath, "utf8");
                this.config = JSON.parse(configJSON);
            } else {
                console.info("No config file found: " + configPath);
                this.config = {}; // JSON.parse(JSON.stringify(ConfigManager.DEFAULT));
            }
        }
        return this.config;
    }

    async saveAll() {
        const configPath = path.resolve(BASE_DIR + '/.config.json');
        let newConfigJSON = JSON.stringify(this.config, null, 4);
        let oldConfigJSON = '';
        try {
            oldConfigJSON = await this.readFileAsync(configPath, "utf8");
        } catch (e) {
            console.error(e.message);
        }
        if(newConfigJSON === oldConfigJSON)
            return false;
        // console.info("Config file updated: " + configPath);
        await this.writeFileAsync(configPath, newConfigJSON, 'utf8');
        return true;
    }

    async promptValue(path, text, defaultValue=null, validation=null) {
        const config = await this.getAll();
        if(!Array.isArray(path))
            path = path.split('.');
        const lastPath = path.pop();
        let target = config;
        for(let i=0; i<path.length; i++) {
            if(typeof target[path[i]] === "undefined")
                target[path[i]] = {};
            if(typeof target[path[i]] !== "object")
                throw new Error("Invalid path: " + path.join('.'));
            target = target[path[i]];
        }
        if(typeof target[lastPath] !== "undefined")
            defaultValue = target[lastPath];
        const value = await this.promptCallback(text, defaultValue, validation);
        target[lastPath] = value;
        // if(this.saveLocal)
        //     await this.saveAll();
        return value;
    }


    accessAsync (path) {
        return new Promise((resolve, reject) => {
            fs.access(path, fs.constants.F_OK, (err) => {
                resolve(!err);
            })
        })
    }


    readFileAsync (path, opts = 'utf8') {
        return new Promise((resolve, reject) => {
            fs.readFile(path, opts, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            })
        })
    }

    writeFileAsync (path, data, opts = 'utf8') {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, data, opts, (err) => {
                if (err) reject(err);
                else resolve();
            })
        })
    }

}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.LocalConfig = LocalConfig;
