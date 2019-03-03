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

    getDefaultSender() { return this.config && this.config.auth ? this.config.auth.user : null; }

    async configure(promptCallback=null) {
        console.info("Configuring Mail Client");
        const localConfig = new LocalConfig(promptCallback);
        const mailConfig = await localConfig.getOrCreate('mail');
        if(typeof mailConfig.auth === "undefined")
            mailConfig.auth = {};

        const hostname = require('os').hostname();
        let attempts = promptCallback ? 3 : 1;
        while(attempts-- > 0) {
            await localConfig.promptValue('mail.host', `Please enter the Mail Server Host`, mailConfig.host || 'mail.' + hostname);
            await localConfig.promptValue('mail.port', `Please enter the Mail Server Port`, mailConfig.port || 587, 'number');
            await localConfig.promptValue('mail.auth.user', `Please enter the Mail Server Username`, mailConfig.auth.user || 'mail@' + mailConfig.host.replace(/mail\./, ''), 'email');
            await localConfig.promptValue('mail.auth.pass', `Please enter the Mail Server Password`, mailConfig.auth.pass || '', 'password');

            try {
                console.info(`Connecting to Mail Server '${mailConfig.host}'...`);
                const server = nodemailer.createTransport(smtpTransport(mailConfig));
                await server.verify();
                console.info(`Connection to Mail Server '${mailConfig.host}' verified`);
                if(promptCallback)
                    await localConfig.saveAll();
                this.config = mailConfig;
                break;
            } catch (e) {
                if(attempts <= 0)
                    throw new Error(`Failed to connect to ${mailConfig.host}: ${e}`);
                console.error(`Error connecting to ${mailConfig.host}: ${e}`);
            }
        }
        // return mailConfig;
    }


    async sendMail(data) {
        if(!this.config)
            throw new Error("Mail client is not configured");
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
