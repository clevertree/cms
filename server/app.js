// app.js
// load the things we need
const path = require('path');
const fs = require('fs');

const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('client-sessions');
const BASE_DIR = path.dirname(__dirname);
const app = express();
exports.app = app;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Sessions
app.use(session({
    cookieName: 'session',
    secret: 'random_string_goes_here',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
}));

app.config = (() => {
    try {
        return require('../config.js');
    } catch (e) {
        return require('./config.sample.js');
    }
})();
app.config.theme = app.config.theme || 'minimal';

// set the view engine to ejs
app.set('view engine', 'ejs');
app.get('/', function(req, res) {
    res.render(BASE_DIR + '/index.ejs', {
        app,
    });
});
app.get('/[\\w/]+\.ejs', function(req, res) {
    res.render(BASE_DIR + req.url, {
        app,
    });
});
app.use(express.static(BASE_DIR));

app.getViewList = function() {
    return fs.readdirSync(BASE_DIR + '/view')
        .map(path => 'view/' + path)
        .filter(file => file.endsWith('.ejs'));
};

app.createMysqlConnection = function() {
    // Mysql
    const db = mysql.createConnection(app.config.mysql);
    app.db = db;

    db.on('error', function (err){
        console.error("DB Error", err);
    });
    db.connect({}, (err) => {
        if (err) {
            console.error(`DB Connection to '${app.config.mysql.database}' Failed`, err.message);
            setTimeout(() => app.createMysqlConnection(), 3000);
            db.end();
        } else {
            console.info(`DB Connecting to '${app.config.mysql.database}' Successful`);
        }
    });
};

app.start = function() {

    // HTTP
    app.listen(app.config.port);
    console.log(`Listening on ${app.config.port}`);

    app.createMysqlConnection();
};


// Include APIs


const APIList = fs.readdirSync(BASE_DIR + '/server/api')
    .map(path => BASE_DIR + '/server/api/' + path)
    .filter(file => file.endsWith('.js'))
    .forEach((apiFile) => require(apiFile)(app));
