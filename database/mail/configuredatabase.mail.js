
class ConfigureDatabaseMail {
    get MailServer() { return require('../../mail/mail.server').MailServer; }

    constructor(requestURL, to, hostname, from=null, subject=null) {
        // sender info
        // from: 'Sender Name <sender@example.com>',
        this.from = from || this.MailServer.getDefaultSender(); //  || 'admin@' + hostname

        // Comma separated list of recipients
        // to: '"Receiver Name" <nodemailer@disposebox.com>',
        this.to = to;

        // Subject of the message
        // subject: 'Nodemailer is unicode friendly ✔',
        this.subject = subject || `Configure Database for ${hostname}`;

        // HTML body
        // html:'<p><b>Hello</b> to myself <img src="cid:note@node"/></p>'+
        //     '<p>Here\'s a nyan cat for you as an embedded attachment:<br/></p>'
        this.html = `
Welcome <em>${to}</em><br/><br/>

A request has been made to configure a new database for <em>${hostname}</em>. <br/><br/>

Please complete the request here:<br/>

<a href="${requestURL}">${requestURL}</a><br/>

Thanks for administrating the site!<br/>
`;

        // plaintext body
        // text: 'Hello to myself!',
        this.text = this.html.replace(/(<([^>]+)>)/ig,"");
    }

    async send() {
        console.log('Sending Email: ', this);
        await this.MailServer.sendMail(this);
        console.log('Message sent successfully!');
    }
}

module.exports = {ConfigureDatabaseMail};

