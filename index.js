const { ConfigManager } = require('./config/config.manager');
const { HTTPServer } = require('./server/http.server');

exports = module.exports = {
    HTTPServer,
    ConfigManager,
    configure: async function(config=null) {
        return await ConfigManager.configure(config);
    },
    getMiddleware: function(config=null) {
        ConfigManager.configure(config);
        return HTTPServer.getMiddleware();
    }
};

exports.version = require('./package.json').version;