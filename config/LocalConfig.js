const path = require('path');
const fs = require('fs');

class LocalConfig {
    constructor() {
        this.config = null;
    }

    has(key) {
        const config = this.getAll();
        return (typeof config[key] === 'undefined')
    }

    get(key) {
        const config = this.getAll();
        if(typeof config[key] === 'undefined')
            throw new Error("Config key not found: " + key);
        return config[key];
    }

    getOrCreate(key) {
        const config = this.getAll();
        if(typeof config[key] === 'undefined')
            config[key] = {};
        return config[key];
    }

    getAll() {
        if(!this.config) {
            const configPath = path.resolve(process.cwd() + '/.config.json');
            try {
                fs.accessSync(configPath);
                const configJSON = fs.readFileSync(configPath, "utf8");
                this.config = JSON.parse(configJSON);
            } catch (e) {
                console.info(e.message || "No config file found: " + configPath);
                this.config = {}; // JSON.parse(JSON.stringify(ConfigManager.DEFAULT));

            }
        }
        return this.config;
    }

    saveAll() {
        const configPath = path.resolve(process.cwd() + '/.config.json');
        let newConfigJSON = JSON.stringify(this.config, null, 4);
        let oldConfigJSON = '';
        try {
            oldConfigJSON = fs.readFileSync(configPath, "utf8");
        } catch (e) {
            console.error(e.message);
        }
        if(newConfigJSON === oldConfigJSON)
            return false;
        // console.info("Config file updated: " + configPath);
        fs.writeFileSync(configPath, newConfigJSON, 'utf8');
        return true;
    }


}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

module.exports = LocalConfig;
