const bodyParser = require('body-parser');
// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const express = require('express');

const BASE_DIR = path.resolve(path.dirname(__dirname));

// Init
class ViewManager {
    constructor(app) {
        this.app = app;
        app.express.use(bodyParser.urlencoded({ extended: true }));
        app.express.use(bodyParser.json());

        app.express.get(['/[\\w/]+(\.ejs)?', '/'], (req, res) => {
            const app = this.app;
            const theme = app.getTheme(app.config.theme || 'minimal');
            theme.render(req, res);
            // this.render(req, res);
        });
        app.express.use(express.static(BASE_DIR));
    }

}

module.exports = {ViewManager};

