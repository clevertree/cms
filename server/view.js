const bodyParser = require('body-parser');
const path = require('path');
const express = require('express');

const BASE_DIR = path.resolve(path.dirname(__dirname));

// Init
class ViewManager {
    constructor(app) {
        app.express.use(bodyParser.urlencoded({ extended: true }));
        app.express.use(bodyParser.json());


// set the view engine to ejs
        app.express.set('view engine', 'ejs');
        app.express.get(['/[\\w/]+\.ejs', '/'], function(req, res) {
            app.user.getSessionUser(req, (error, sessionUser) => {
                res.render(BASE_DIR + req.url, {
                    app, req, sessionUser
                });
            });
        });
        app.express.use(express.static(BASE_DIR));

    }
}

module.exports = {ViewManager};