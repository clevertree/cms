const express = require('express');
const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");
const path = require('path');

const { FileManager } = require('../file/file.manager');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class ConfigManager {
    constructor() {
        this.config = null;
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
        console.info("Config file updated: " + configPath);
        await FileManager.writeFileAsync(configPath, newConfigJSON, 'utf8');
        return true;
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
}

// ConfigManager.DEFAULT = {
//     debug: true,
// };

exports.ConfigManager = new ConfigManager();
