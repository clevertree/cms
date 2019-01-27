class ForgotPasswordMail {
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

    constructor(app, user, recoveryURL) {
        this.app = app;
        // this.user = user;
        this.data = {
            from:app.config.mail.auth.user,
            to:user.email,
            subject: "Forgot Password",
        };
        let fullname = user.profile.name;
        if(fullname) {
            this.data.to = `"${fullname}" <${this.data.to}>`;
        } else {
            fullname = this.data.to;
        }
        this.data.text = `Dear ${fullname},

You have requested a new password. You may change your password at the following address:

${recoveryURL}

Thanks for browsing the site!`;
    }

    async send() {
        // console.log('Sending Mail');
        await this.app.mail.sendMail(this.data);

        // console.log('Message sent successfully!');

    }
}

module.exports = {ForgotPasswordMail};

