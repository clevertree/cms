const express = require('express');
const clevertree = require('.');

// Create Express
const app = express();


// Add Your App
app.use(express.static(__dirname));



// Add CMS middleware
app.use(clevertree.getMiddleware({
    database: {
        host: 'localhost',
        user: 'cms_user',
        password: 'cms_pass',
        database: 'afoh_info_cms',
    },
    server: {
        httpPort: 8080,
        sslEnable: false,
        // sslPort: 8443,
    },
    mail: {
        auth: {
            // user: "mail@server.com",
            // pass: "mailmail"
        },
        // host: "mail.server.com",
        port: 587
    }
}));



// Launch your server
const httpPort = 8080;
app.listen(httpPort, function() {
    console.log('Example app listening on port: ' + httpPort);
});

