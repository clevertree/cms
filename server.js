const express = require('express');

const { DatabaseManager } = require('./database/database.manager');
const { APIServer } = require('./api/api.server');
const { MailServer } = require('./mail/mail.server');

(async () => {
    // Listen for HTTP(S)
    // await APIServer.listen();

    await APIServer.configure(true);

    const server = express();
    server.use(await APIServer.getMiddleware());
    const port = 8080;
    server.listen(port);
    console.log(`Listening on ${port}`);

    // Listen for Mail ports
    await MailServer.listen();
})();