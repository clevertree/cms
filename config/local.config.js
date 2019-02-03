const express = require('express');
const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");
const path = require('path');

const { FileManager } = require('../service/file/file.manager');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class LocalConfig {
    constructor(config=null, saveLocal=false) {
        this.config = null;
        if(config) {
            if(typeof config !== 'object')
                throw new Error("Config must be an object");
            this.config = config;
        }
        this.saveLocal = saveLocal;
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
            if (await FileManager.accessAsync(configPath)) {
                const configJSON = await FileManager.readFileAsync(configPath, "utf8");
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
            oldConfigJSON = await FileManager.readFileAsync(configPath, "utf8");
        } catch (e) {
            console.error(e.message);
        }
        if(newConfigJSON === oldConfigJSON)
            return false;
        // console.info("Config file updated: " + configPath);
        await FileManager.writeFileAsync(configPath, newConfigJSON, 'utf8');
        return true;
    }

    async promptValue(path, text, defaultValue=null) {
        const config = await this.getAll();
        if(!Array.isArray(path))
            path = path.split('.');
        const lastPath = path.pop();
        let target = config;
        for(let i=0; i<path.length; i++) {
            if(typeof target[path[i]] === "undefined")
                target[path[i]] = {};
            if(typeof target[path[i]] !== "object")
                throw new Error("Invalid path: " + path.join('.'))
            target = target[path[i]];
        }
        if(typeof target[lastPath] !== "undefined")
            defaultValue = target[lastPath];
        const value = await this.prompt(text, defaultValue);
        target[lastPath] = value;
        if(this.saveLocal)
            await this.saveAll();
        return value;
    }


    prompt(text, defaultValue=null) {
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

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.LocalConfig = LocalConfig;
