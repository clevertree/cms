const fs = require('fs');
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const BASE_DIR = path.resolve(path.dirname(__dirname));

class ConfigManager {
    constructor() {
        this.config = null;
        const configPath = path.resolve(BASE_DIR + '/.config.json');
        const configJSON = fs.readFileSync(configPath, "utf8");
        this.config = JSON.parse(configJSON);
        return this.config;
    }

    getConfig() {
        return this.config;
    }

    save() {
        let newConfigJSON = JSON.stringify(this.config, null, 4);
        const oldConfigJSON = fs.readFileSync(configPath, "utf8");
        if(newConfigJSON === oldConfigJSON)
            return false;
        fs.writeFileSync(configPath, newConfigJSON, 'utf8');
        return true;
    }
}

exports.ConfigManager = new ConfigManager();
