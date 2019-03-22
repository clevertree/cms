const HTTPServer = require('./server/HTTPServer');

exports = module.exports = {
    HTTPServer,
    configure: async function() {
        return await new HTTPServer().configure();
    },
    getMiddleware: function(config=null) {
        const httpServer = new HTTPServer(config);
        return httpServer.getMiddleware();
    }
};

exports.version = require('./package.json').version;