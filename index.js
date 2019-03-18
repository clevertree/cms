const { ConfigManager } = require('./config/config.manager');
const { HTTPServer } = require('./http/http.server');

exports = module.exports = {
    HTTPServer,
    ConfigManager,
    configure: function(config) {
        ConfigManager.configure(config);
    },
    getMiddleware: function(config=null) {
        if(config)
            ConfigManager.configure(config);
        return HTTPServer.getMiddleware();
    }
};

exports.version = require('./package.json').version;