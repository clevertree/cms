const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const LocalConfig = require('../config/LocalConfig');
const InteractiveConfig = require('../config/InteractiveConfig');

// const BASE_DIR = path.resolve(path.dirname(__dirname));

class MailClient {
    constructor(config) {
        this.server = null;
        if(!config.mail)
            config.mail = {};
        if(!config.mail.client)
            config.mail.client = {};
        this.mailConfig = config.mail.client;
    }

    getDefaultSender() { return this.mailConfig && this.mailConfig.auth ? this.mailConfig.auth.user : null; }

    async configure() {
        // console.info("Configuring Mail Client");
        let mailConfig = Object.assign({}, this.mailConfig);
        const interactiveConfig = new InteractiveConfig(mailConfig);

        if (typeof mailConfig.client === "undefined")
            mailConfig.client = {};
        let mailClientConfig = mailConfig.client;
        if (typeof mailClientConfig.auth === "undefined")
            mailClientConfig.auth = {};

        const hostname = require('os').hostname();
        let attempts = 3;
        while (attempts-- > 0) {
            await interactiveConfig.promptValue('client.host', `Please enter the Mail Server Host`, mailClientConfig.host || 'mail.' + hostname);
            await interactiveConfig.promptValue('client.port', `Please enter the Mail Server Port`, mailClientConfig.port || 587, 'number');
            await interactiveConfig.promptValue('client.auth.user', `Please enter the Mail Server Username`, mailClientConfig.auth.user || 'mail@' + mailClientConfig.host.replace(/mail\./, ''), 'email');
            await interactiveConfig.promptValue('client.auth.pass', `Please enter the Mail Server Password`, mailClientConfig.auth.pass || '', 'password');
            let testMail = await interactiveConfig.prompt(`Would you like to test the Mail Settings [y or n]?`, false, 'boolean');

            try {
                if (testMail) {
                    console.info(`Connecting to Mail Server '${mailClientConfig.host}'...`);
                    const server = nodemailer.createTransport(smtpTransport(mailClientConfig));
                    await
                    server.verify();
                    console.info(`Connection to Mail Server '${mailClientConfig.host}' verified`);
                }
                break;
            } catch (e) {
                if (attempts <= 0)
                    throw new Error(`Failed to connect to ${mailClientConfig.host}: ${e}`);
                console.error(`Error connecting to ${mailClientConfig.host}: ${e}`);
            }
        }
        this.mailConfig = mailConfig;

        const localConfig = new LocalConfig();
        const allConfig = await localConfig.getAll();
        allConfig.mail = mailConfig;
        await localConfig.saveAll();
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

module.exports = MailClient;
