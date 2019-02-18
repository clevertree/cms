
const { HTTPServer } = require('./service/http/http.server');

(async () => {
    if(process && process.argv && process.argv.indexOf('--interactive') !== -1) {
        try {
            console.log("Starting interactive configuration");
            await HTTPServer.configureInteractive();
        } catch (e) {

        }
    }


    // Listen for HTTP(S)
    await HTTPServer.listen();

})();