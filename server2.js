const express = require('express');
const clevertree = require('.');

// Create Express
const app = express();

// Add Your App
app.use(express.static(__dirname));

// Add CMS middleware
app.use(clevertree.getMiddleware({
    database: {
        'wut': 'ohok'
    }
}));

// Launch server
const httpPort = 8080;
app.listen(httpPort, function() {
    console.log('Example app listening on port: ' + httpPort);
});
