const { ConfigManager } = require('./config/config.manager');
const { HTTPServer } = require('./http/http.server');

exports = module.exports = {
    HTTPServer,
    ConfigManager
};

exports.version = require('./package.json').version;