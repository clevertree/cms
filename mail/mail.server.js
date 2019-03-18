const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const { LocalConfig } = require('../config/local.config');
const { InteractiveConfig } = require('../config/interactive.config');
// const { DatabaseManager } = require('../database/database.manager');

// const BASE_DIR = path.resolve(path.dirname(__dirname));

class MailServer {
    constructor() {
        this.server = null;
        this.mailConfig = {};
    }

    getDefaultSender() { return this.mailConfig && this.mailConfig.auth ? this.mailConfig.auth.user : null; }

    async configure(config=null) {
        if(config && typeof config.mail === 'object') {
            Object.assign(this.mailConfig, config.database);
        } else {
            const localConfig = new LocalConfig();
            const mailConfig = await localConfig.getOrCreate('mail');
            Object.assign(this.mailConfig, mailConfig);
            Object.assign(mailConfig, this.mailConfig);
            await localConfig.saveAll()
        }
    }


    async configureInteractive() {
        await this.configure();

        // console.info("Configuring Mail Client");
        if(typeof this.mailConfig.auth !== 'object') {
            console.warn("Mail settings not provided. Please configure mail client via browser administration");
            // TODO test mail
        } else {
            let mailConfig = Object.assign({}, this.mailConfig);
            const interactiveConfig = new InteractiveConfig(mailConfig);

            if (typeof mailConfig.auth === "undefined")
                mailConfig.auth = {};

            const hostname = require('os').hostname();
            let attempts = 3;
            while (attempts-- > 0) {
                await interactiveConfig.promptValue('mail.host', `Please enter the Mail Server Host`, mailConfig.host || 'mail.' + hostname);
                await interactiveConfig.promptValue('mail.port', `Please enter the Mail Server Port`, mailConfig.port || 587, 'number');
                await interactiveConfig.promptValue('mail.auth.user', `Please enter the Mail Server Username`, mailConfig.auth.user || 'mail@' + mailConfig.host.replace(/mail\./, ''), 'email');
                await interactiveConfig.promptValue('mail.auth.pass', `Please enter the Mail Server Password`, mailConfig.auth.pass || '', 'password');
                let testMail = await interactiveConfig.prompt(`Would you like to test the Mail Settings [y or n]?`, false, 'boolean');

                try {
                    if (testMail) {
                        console.info(`Connecting to Mail Server '${mailConfig.host}'...`);
                        const server = nodemailer.createTransport(smtpTransport(mailConfig));
                        await
                        server.verify();
                        console.info(`Connection to Mail Server '${mailConfig.host}' verified`);
                    }
                    break;
                } catch (e) {
                    if (attempts <= 0)
                        throw new Error(`Failed to connect to ${mailConfig.host}: ${e}`);
                    console.error(`Error connecting to ${mailConfig.host}: ${e}`);
                }
            }
            this.mailConfig = mailConfig;

            const localConfig = new LocalConfig();
            const allConfig = await localConfig.getAll();
            allConfig.mail = mailConfig;
            await localConfig.saveAll();
        }
        // return mailConfig;
    }


    async sendMail(data) {
        if(!this.mailConfig)
            throw new Error("Mail client is not configured");
        if(!data.from)
            data.from = this.mailConfig.auth.user;
        const server = nodemailer.createTransport(smtpTransport(this.mailConfig));
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
