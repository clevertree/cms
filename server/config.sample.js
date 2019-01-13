module.exports = {
    theme: 'minimal',
    port: 8090,
    debugPort: 80,
    debug: false,
    user: {
        profile: [
            {name: 'name'},
            {name: 'description', type:'textarea'},
        ],
    },
    session: {
        secret: 'random_string_goes_here'
    },
    mysql: {
        database:   'afoh',
        user:       'afoh',
        // password:   null,
        host:       'localhost',
    }
};