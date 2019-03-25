const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const LocalConfig = require('../config/LocalConfig');
const InteractiveConfig = require('../config/InteractiveConfig');

// const BASE_DIR = path.resolve(path.dirname(__dirname));

class MailClient {
    constructor(config) {
        if(!config.mail)
            config.mail = {};
        if(!config.mail.client)
            config.mail.client = {};
        this.mailConfig = config.mail.client;
        // this.transport = null;
    }

    getDefaultSender() { return this.mailConfig && this.mailConfig.auth ? this.mailConfig.auth.user : null; }

    async configure(interactive=false) {
        // console.info("Configuring Mail Client");
        let mailConfig = Object.assign({}, this.mailConfig);
        const interactiveConfig = new InteractiveConfig(mailConfig, interactive);

        if (typeof mailConfig.auth === "undefined")
            mailConfig.auth = {};

        const hostname = require('os').hostname();
        let attempts = 3;
        while (attempts-- > 0) {
            await interactiveConfig.promptValue('client.host', `Please enter the Mail Server Host`, mailConfig.host || 'mail.' + hostname);
            await interactiveConfig.promptValue('client.port', `Please enter the Mail Server Port`, mailConfig.port || 587, 'number');
            await interactiveConfig.promptValue('client.auth.user', `Please enter the Mail Server Username`, mailConfig.auth.user || 'mail@' + mailConfig.host.replace(/mail\./, ''), 'email');
            await interactiveConfig.promptValue('client.auth.pass', `Please enter the Mail Server Password`, mailConfig.auth.pass || '', 'password');
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
        // return mailConfig;
    }


    async sendMail(data) {
        if(!this.mailConfig)
            throw new Error("Mail client is not configured");
        if(!data.from)
            data.from = this.mailConfig.auth.user;
        const transport = nodemailer.createTransport(smtpTransport(this.mailConfig));
        return await transport.sendMail(data)
    }

    // async listen() {
    //     const mailConfig = await this.configure();
    //     this.transport = nodemailer.createTransport(smtpTransport(mailConfig));
    //     // await this.transport.verify();
    //     // console.log(`Connection to Mail Server '${mailConfig.host}' successful`);
    // }
}

module.exports = MailClient;
