const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const { DatabaseManager } = require('../database/database.manager');

// const BASE_DIR = path.resolve(path.dirname(__dirname));

class MailServer {
    constructor() {
        this.server = null;
    }

    async configure(forcePrompt=false)
    {
        const configDB = await DatabaseManager.getConfigDB();
        let mailConfig = await configDB.fetchConfigValues('mail');
        if(typeof mailConfig.auth === "undefined")
            mailConfig.auth = {};
        let verifyConfig = false;
        if(forcePrompt || !mailConfig.host || !mailConfig.port || !mailConfig.auth.user) {
            const hostname = 'mail.' + require('os').hostname();

            await configDB.promptValue('mail.host', `Please enter the Mail Server Host`, mailConfig.host || hostname);
            await configDB.promptValue('mail.port', `Please enter the Mail Server Port`, mailConfig.port || 587);
            await configDB.promptValue('mail.auth.user', `Please enter the Mail Server Username`, mailConfig.auth.user);
            await configDB.promptValue('mail.auth.pass', `Please enter the Mail Server Password`, mailConfig.auth.pass);
            mailConfig = await configDB.fetchConfigValues('mail');
            verifyConfig = true;
        }

        try {
            if(verifyConfig) {
                const server = nodemailer.createTransport(smtpTransport(mailConfig));
                await server.verify();
                console.info(`Connection to Mail Server '${mailConfig.host}' verified`);
            }
            // await configDB.saveAll();

        } catch (e) {
            console.error(`Error connecting to ${mailConfig.host}: ${e}`);
            if(forcePrompt === false)
                return await this.configure(true);
            throw e;
        }
        return mailConfig;
    }


    async listen() {
        const mailConfig = await this.configure();
        this.server = nodemailer.createTransport(smtpTransport(mailConfig));
        await this.server.verify();
        console.log(`Connection to Mail Server '${mailConfig.host}' successful`);
    }
}

exports.MailServer = new MailServer();
