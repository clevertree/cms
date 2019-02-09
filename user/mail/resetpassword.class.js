const { MailServer } = require('../../service/mail/mail.server');

class ResetPasswordEmail {
    // sender info
    // from: 'Sender Name <sender@example.com>',

    // Comma separated list of recipients
    // to: '"Receiver Name" <nodemailer@disposebox.com>',

    // Subject of the message
    // subject: 'Nodemailer is unicode friendly ✔',

    // plaintext body
    // text: 'Hello to myself!',

    // HTML body
    // html:'<p><b>Hello</b> to myself <img src="cid:note@node"/></p>'+
    //     '<p>Here\'s a nyan cat for you as an embedded attachment:<br/></p>'

    constructor(recoveryURL, to, from, subject="Reset Password") {
        // this.user = user;
        this.data = {from, to, subject};
        this.data.text = `User ${to},

You have requested a new password. You may change your password at the following address:

${recoveryURL}

Thanks for browsing the site!`;
    }

    async send() {
        console.log('Sending Reset Password Email');
        await MailServer.sendMail(this.data);
        console.log('Message sent successfully!');
    }
}

module.exports = {ResetPasswordEmail};

