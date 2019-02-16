
const { HTTPServer } = require('./service/http/http.server');

(async () => {
    // Listen for HTTP(S)
    // await HTTPServer.configure();
    // await SSLServer.listen();

    // await DatabaseManager.configure({
    //     "host": "localhost",
    //     "user": "cms",
    //     "password": "cms",
    // });

    await HTTPServer.listen();

    // const express = require('express');
    // const server = express({});
    // server.use(HTTPServer.getMiddleware());
    // const port = 8080;
    // server.listen(port);
    // console.log(`Listening on ${port}`);

})();