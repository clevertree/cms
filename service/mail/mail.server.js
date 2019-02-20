const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const { DatabaseManager } = require('../../database/database.manager');

// const BASE_DIR = path.resolve(path.dirname(__dirname));

class MailServer {
    constructor() {
        this.server = null;
        this.config = null;
    }

    async configure(forcePrompt=0)
    {
        const configDB = new ConfigDatabase();
        let mailConfig = await configDB.fetchConfigValues('mail');
        if(typeof mailConfig.auth === "undefined")
            mailConfig.auth = {};
        // let verifyConfig = false;
        if(forcePrompt || !mailConfig.host || !mailConfig.port || !mailConfig.auth.user) {
            const hostname = 'mail.' + require('os').hostname();

            await configDB.promptValue('mail.host', `Please enter the Mail Server Host`, mailConfig.host || hostname);
            await configDB.promptValue('mail.port', `Please enter the Mail Server Port`, mailConfig.port || 587, 'number');
            await configDB.promptValue('mail.auth.user', `Please enter the Mail Server Username`, mailConfig.auth.user, 'email');
            await configDB.promptValue('mail.auth.pass', `Please enter the Mail Server Password`, null, 'password');
            mailConfig = await configDB.fetchConfigValues('mail');
            // verifyConfig = true;
        }

        try {
            // if(verifyConfig) {
            const server = nodemailer.createTransport(smtpTransport(mailConfig));
            await server.verify();
            console.info(`Connection to Mail Server '${mailConfig.host}' verified`);
            // }
            // await configDB.saveAll();

        } catch (e) {
            console.error(`Error connecting to ${mailConfig.host}: ${e}`);
            if(forcePrompt < 3) {
                console.error(e.message);
                return await this.configure(forcePrompt + 1);
            }
            throw e;
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
