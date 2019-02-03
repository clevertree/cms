const express = require('express');

// const { DatabaseManager } = require('./database/database.manager');
const { APIServer } = require('./api/api.server');
const { MailServer } = require('./mail/mail.server');

(async () => {
    // Listen for HTTP(S)
    // await APIServer.configure();
    await APIServer.listen();

    // Listen for Mail ports
    await MailServer.listen();

    // await DatabaseManager.configure(true);
    // const config = await APIServer.configure(true);
    //
    // const server = express();
    // server.use(APIServer.getMiddleware());
    // const port = config.port || 8080;
    // server.listen(port);
    // console.log(`Listening on ${port}`);

})();