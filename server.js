// const { DatabaseManager } = require('./database/database.manager');
const { APIServer } = require('./api/api.server');
const { MailServer } = require('./mail/mail.server');

(async () => {
    // Listen for HTTP(S)
    await APIServer.listen();
    // Listen for Mail ports
    await MailServer.listen();
})();