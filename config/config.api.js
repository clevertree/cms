const express = require('express');

const { DatabaseManager } = require('../database/database.manager');
const { ThemeManager } = require('../theme/theme.manager');
const { ConfigDatabase } = require("./config.database");
const { UserDatabase } = require("../user/user.database");
const { UserAPI } = require('../user/user.api');

class ConfigAPI {
    constructor() {
        this.router = null;
    }


    getMiddleware() {
        if(!this.router)
            this.configure();

        return (req, res, next) => {
            // if(!req.url.startsWith('/:config'))
            //     return next();
            return this.router(req, res, next);
        }
    }

    async configure() {
        // Configure Routes
        const router = express.Router();
        const bodyParser = require('body-parser');
        const PM = [bodyParser.urlencoded({ extended: true }), bodyParser.json()];
        const SM = UserAPI.getSessionMiddleware();

        // Handle Config requests
        router.all(['/[:]config', '/[:]config/[:]list'],           SM, PM, async (req, res) => await this.renderConfigBrowser(req, res));
        this.router = router;
    }

    async renderConfigBrowser(req, res) {
        try {

            if (req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<section>
    <script src="/config/form/configform-editor.client.js"></script>
    <configform-editor></configform-editor>
</section>
`)
                );

            } else {
                const configDB = await DatabaseManager.getConfigDB(req);
                // Handle POST
                let whereSQL = '1', values = null;
                if(req.body.search) {
                    whereSQL = 'a.name LIKE ?';
                    values = ['%'+req.body.search+'%'];
                }
                const configs = await configDB.selectConfigs(whereSQL, values);

                return res.json({
                    message: `${configs.length} Config${configs.length > 1 ? 's' : ''} queried successfully`,
                    configs
                });
            }
        } catch (error) {
            console.log(error);
            res.status(400);
            if(req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `<section class='error'><pre>${error.stack}</pre></section>`)
                );
            } else {
                res.json({message: error.stack});
            }
        }

    }
}


module.exports = {ConfigAPI: new ConfigAPI()};

