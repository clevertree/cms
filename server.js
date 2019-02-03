

// const { DatabaseManager } = require('./database/database.manager');
const { SSLServer } = require('./service/http/ssl.server');
const { HTTPServer } = require('./service/http/http.server');
const { MailServer } = require('./service/mail/mail.server');

(async () => {
    // Listen for HTTP(S)
    // await HTTPServer.configure();
    // await SSLServer.listen();
    await HTTPServer.listen();

    // Listen for Mail ports
    await MailServer.listen();

    // const config = await HTTPServer.configure(true);
    // const express = require('express');
    // const server = express(config);
    // server.use(HTTPServer.getMiddleware());
    // const port = config.port || 8080;
    // server.listen(port);
    // console.log(`Listening on ${port}`);

})();