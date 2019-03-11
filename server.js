
const { ConfigManager } = require('./config/config.manager');
const { HTTPServer } = require('./http/http.server');

(async () => {
    if(process && process.argv && process.argv.indexOf('--configure') !== -1) {
        console.log("Starting configuration");
        await ConfigManager.configure(true);
    } else {
        await ConfigManager.configure(false);
    }


    //     Listen for HTTP(S)
    await HTTPServer.listen();

})();