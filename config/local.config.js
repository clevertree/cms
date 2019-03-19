const path = require('path');
const fs = require('fs');

// const { FileManager } = require('../file/file.manager');
// const { ConfigManager } = require('./config.manager');promptCallback

// const BASE_DIR = path.resolve(path.dirname(__dirname));

// Missing database config always prompts. --configure forces all config options
class LocalConfig {
    constructor() {
        this.config = null;
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
            const configPath = path.resolve(process.cwd() + '/.config.json');
            if (await this.accessAsync(configPath)) {
                const configJSON = await this.readFileAsync(configPath, "utf8");
                this.config = JSON.parse(configJSON);
            } else {
                // console.info("No config file found: " + configPath);
                this.config = {}; // JSON.parse(JSON.stringify(ConfigManager.DEFAULT));
            }
        }
        return this.config;
    }

    async saveAll() {
        const configPath = path.resolve(process.cwd() + '/.config.json');
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
