const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const { LocalConfig } = require('../config/local.config');
// const { DatabaseManager } = require('../database/database.manager');

// const BASE_DIR = path.resolve(path.dirname(__dirname));

class MailServer {
    constructor() {
        this.server = null;
        this.config = null;
    }

    async configure(promptCallback=null)
    {
        const localConfig = new LocalConfig(promptCallback);
        const mailConfig = await localConfig.getOrCreate('mail');
        if(typeof mailConfig.auth === "undefined")
            mailConfig.auth = {};

        const hostname = 'mail.' + require('os').hostname();
        let attempts = promptCallback ? 3 : 1;
        while(attempts-- > 0) {
            await localConfig.promptValue('mail.host', `Please enter the Mail Server Host`, mailConfig.host || hostname);
            await localConfig.promptValue('mail.port', `Please enter the Mail Server Port`, mailConfig.port || 587, 'number');
            await localConfig.promptValue('mail.auth.user', `Please enter the Mail Server Username`, mailConfig.auth.user, 'email');
            await localConfig.promptValue('mail.auth.pass', `Please enter the Mail Server Password`, null, 'password');

            try {
                console.info(`Connecting to Mail Server '${mailConfig.host}'...`);
                const server = nodemailer.createTransport(smtpTransport(mailConfig));
                await server.verify();
                console.info(`Connection to Mail Server '${mailConfig.host}' verified`);
                break;
            } catch (e) {
                console.error(`Error connecting to ${mailConfig.host}: ${e}`);
            }
        }
        this.config = mailConfig;
        return mailConfig;
    }

    async sendMail(data) {
        if(!this.config)
            await this.configure();
        if(!data.from)
            data.from = this.config.auth.user;
        const server = nodemailer.createTransport(smtpTransport(this.config));
        return await server.sendMail(data)
    }

    async listen() {
        const mailConfig = await this.configure();
        this.server = nodemailer.createTransport(smtpTransport(mailConfig));
        // await this.server.verify();
        // console.log(`Connection to Mail Server '${mailConfig.host}' successful`);
    }
}

exports.MailServer = new MailServer();
