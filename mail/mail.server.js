const fs = require('fs');
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const { DatabaseManager } = require('../database/database.manager');

const BASE_DIR = path.resolve(path.dirname(__dirname));

class MailServer {
    constructor() {
        this.server = null;
    }


    async listen(prompt = false) {
        const configDB = await DatabaseManager.getConfigDB();
        let mailConfig = await configDB.getConfigValues('mail');
        if(typeof mailConfig.auth === "undefined")
            mailConfig.auth = {};
        if(prompt || !mailConfig.host || !mailConfig.port || !mailConfig.auth.user) {
            const hostname = 'mail.' + require('os').hostname();

            await configDB.promptValue('mail.host', `Please enter the Mail Server Host`, mailConfig.host || hostname);
            await configDB.promptValue('mail.port', `Please enter the Mail Server Port`, mailConfig.port || 587);
            await configDB.promptValue('mail.auth.user', `Please enter the Mail Server Username`, mailConfig.auth.user);
            await configDB.promptValue('mail.auth.pass', `Please enter the Mail Server Password`, mailConfig.auth.pass);
            mailConfig = await configDB.getConfigValues('mail');
        }

        try {
            this.server = nodemailer.createTransport(smtpTransport(mailConfig));
            await this.server.verify();
            console.info(`Connection to Mail Server '${mailConfig.host}' Successful`);
            // await configDB.saveAll();

        } catch (e) {
            console.error(`Error connecting to ${mailConfig.host}: ${e}`);
            await this.listen(true);
        }
    }
}

exports.MailServer = new MailServer();
