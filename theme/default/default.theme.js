// const fs = require('fs');
const path = require('path');
// const ejs = require('ejs');

// const { ContentTable } = require('../../content/content.database');

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

        // Assemble without ejs?
        // Fetch all missing parts of html
        // CSS themes built in vs uploaded

        `<!DOCTYPE html>
<html>
    <head>
        <base href="<%=baseURL;%>">
        <title><%=title%></title>
        <meta http-equiv="content-type" content="text/html; charset=utf-8" />
        <meta name="keywords" CONTENT="<%=keywords || ""%>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="userID" content="<%-session ? session.userID : ''%>">

        <link href=":theme/default/:client/default.theme.css" rel="stylesheet" />
        <script src=":theme/default/:client/element/theme-default-nav-menu.element.js"></script>
    </head>
    <body class='theme-default'>
<%- htmlHeader || include('header.partial.ejs') %>

        <article<%-id ? \` data-content-id="${id}"\` : ''%>>
            <%-data%>
        </article>

<%- htmlFooter || include('footer.partial.ejs') %>
    </body>
</html>`;



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