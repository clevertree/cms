module.exports = {
    server: {
        baseHRef: 'https://' + require("os").hostname(), // 'http://localhost',
        port: 8090,
        debugPort: 80,
    },
    theme: 'minimal',
    debug: false,
    user: {
        profile: [
            {name: 'name'},
            {name: 'description', type:'textarea'},
        ],
    },
    mail: {
        host : "mail.ffga.me",
        port: 587,
        auth : {
            user : "mail@clevetree.net",
            pass : "mailmail"
        }
    },
    session: {
        secret: 'random_string_goes_here',
        // cookieName: 'session',
        duration: 12 * 60 * 60 * 1000,
        activeDuration: 60 * 60 * 1000,
    },
    mysql: {
        database:   'afoh',
        user:       'afoh',
        // password:   null,
        host:       'localhost',
    }
};