
const { ConfigManager } = require('./config/config.manager');

(async () => {
    if(process && process.argv && process.argv.indexOf('--configure') !== -1) {
        try {
            console.log("Starting configuration");
            await ConfigManager.configure(true);
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }


    //     Listen for HTTP(S)
    await HTTPServer.listen();

})();