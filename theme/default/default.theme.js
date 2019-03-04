// const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
// const { ContentDatabase } = require('../../content/content.database');

const DIR_TEMPLATE = path.resolve(__dirname + '/template');
const DIR_CLIENT_ASSETS = path.resolve(__dirname + '/client');
// const BASE_DIR = path.resolve((path.dirname(path.dirname(__dirname))));

class DefaultTheme {
    constructor() {
    }

    getThemeAssetsDirectory() {
        return DIR_CLIENT_ASSETS;
    }

    async render(req, content) {

        try {
            const templatePath = path.resolve(DIR_TEMPLATE + '/theme.ejs');
            // res.render(templatePath)
            return await ejs.renderFile(templatePath, content);
        } catch (e) {
            console.error(e);
            return "Error Rendering Theme: " + e.stack;
        }
    }

}

module.exports = DefaultTheme;

// function sendErr(res, e) {
//     console.error(e);
//     res.send(e.message ? e.message + "<br/>\n" + JSON.stringify(e) : e);
// }