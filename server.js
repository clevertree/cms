// server.js
// load the things we need
const path = require('path');
const fs = require('fs');
var express = require('express');
var app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');


const config = (() => {
    try {
        return require('../config.js');
    } catch (e) {
        return require('./config.sample.js');
    }
})();

app.get('/', function(req, res) {
    const articleList = fs.readdirSync(__dirname + '/article')
        .map(path => 'article/' + path)
        .filter(file => file.endsWith('.ejs'));
    res.render(__dirname + '/index', {
        config: config,
        articleList, articleList
    });
});
app.use(express.static(__dirname));

app.listen(config.port);
console.log(`Listening on ${config.port}`);
