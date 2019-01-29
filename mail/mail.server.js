const fs = require('fs');
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const { ConfigManager } = require('../config/config.manager');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class MailServer {
    constructor() {
        this.server = null;
    }


    async listen(prompt = false) {
        const mailConfig = await ConfigManager.getOrCreate('mail');
        if(typeof mailConfig.auth === "undefined")
            mailConfig.auth = {};
        if(prompt || !mailConfig.host || !mailConfig.port || !mailConfig.auth.user || !mailConfig.auth.pass) {
            const hostname = 'mail.' + require('os').hostname();

            mailConfig.host = (await ConfigManager.prompt(`Please enter the Mail Server Host`, mailConfig.host || hostname));
            mailConfig.port = (await ConfigManager.prompt(`Please enter the Mail Server Port`, mailConfig.port || 587));
            mailConfig.auth.user = (await ConfigManager.prompt(`Please enter the Mail Server Username`, mailConfig.auth.user));
            mailConfig.auth.pass = (await ConfigManager.prompt(`Please enter the Mail Server Password`, mailConfig.auth.pass));
        }

        try {
            this.server = nodemailer.createTransport(smtpTransport(mailConfig));
            await new Promise((resolve, reject) => {
                this.server.verify((error, success) => {
                    if (error || !success)
                        reject(error);
                    else
                        resolve(true);
                });
            });
            console.info(`Connection to Mail Server '${mailConfig.host}' Successful`);
            await ConfigManager.saveAll();

        } catch (e) {
            console.error(`Error connecting to ${mailConfig.host}: ${e}`);
            await this.listen(true);
        }
    }
}

exports.MailServer = new MailServer();
