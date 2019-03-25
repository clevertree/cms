
class MessageNotificationMail {

    constructor(requestURL, userMessage, viewMessageBody=false) {
        // this.mailClient = mailClient;

        // sender info
        // from: 'Sender Name <sender@example.com>',
        // this.from = this.mailClient.getDefaultSender(); //  || 'admin@' + hostname
// userMessage.from ||
        // Comma separated list of recipients
        // to: '"Receiver Name" <nodemailer@disposebox.com>',
        this.to = userMessage.to;

        // Subject of the message
        // subject: 'Nodemailer is unicode friendly ✔',
        this.subject = userMessage.subject;
        this.text = userMessage.body;
        this.text += `
         
You may view the message here:
${requestURL}

Thanks!
        `;

        if(!viewMessageBody) {
            this.subject = "A private message has been sent to you";

            this.html = `
Welcome <em>${this.to}</em><br/><br/>

A private message has been send to <strong>${this.to}</strong>. <br/><br/>

You may view the message here:<br/>
<a href="${requestURL}">${requestURL}</a><br/>

Thanks!<br/>
`;

            // plaintext body
            // text: 'Hello to myself!',
            this.text = this.html.replace(/(<([^>]+)>)/ig,"");
        }
    }

    async send(mailClient) {
        if(!this.from)
            this.from = mailClient.getDefaultSender(); //  || 'admin@' + hostname
        console.log('Sending Email: ', this);
        await mailClient.sendMail(this);
        console.log(this.constructor.name + 'sent successfully!');
    }
}

module.exports = MessageNotificationMail;

