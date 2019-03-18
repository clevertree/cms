const path = require('path');
const express = require('express');

const { LocalConfig } = require('../config/local.config');
const { InteractiveConfig } = require('../config/interactive.config');

const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));

class HTTPServer {
    constructor() {
        this.httpServer = null;
        this.sslServer = null;
        this.serverConfig = {
            httpPort: 8080,
            sslEnable: false,
            sslPort: 8443,
            // insecureAuth: true,
        };
    }

    async configure(config=null) {
        if(config && typeof config.database === 'object') {
            Object.assign(this.serverConfig, config.database);
        } else {
            const localConfig = new LocalConfig();
            const serverConfig = await localConfig.getOrCreate('server');
            Object.assign(this.serverConfig, serverConfig);
            Object.assign(serverConfig, this.serverConfig);
            await localConfig.saveAll();
        }
    }


    async configureInteractive() {
        await this.configure();

        // const defaultHostname     = (require('os').hostname()).toLowerCase();
        let serverConfig = Object.assign({}, this.serverConfig);
        const interactiveConfig = new InteractiveConfig(serverConfig);

        let attempts = 3;
        while (attempts-- > 0) {
            await interactiveConfig.promptValue('httpPort', `Please enter the Server HTTP Port`, serverConfig.httpPort, 'integer');
            await interactiveConfig.promptValue('sslEnable', `Enable SSL Server with GreenLock [y or n]?`, serverConfig.sslEnable, 'boolean');

            if (serverConfig.sslEnable) {
                // Configure SSL
                // const serverConfig = await localConfig.getOrCreate('server');
                if (!serverConfig.greenlock) serverConfig.greenlock = {};
                if (!serverConfig.greenlock.server) serverConfig.greenlock.server = 'https://acme-v02.api.letsencrypt.org/directory';
                // Note: If at first you don't succeed, stop and switch to staging:
                // https://acme-staging-v02.api.letsencrypt.org/directory
                if (!serverConfig.greenlock.version) serverConfig.greenlock.version = 'draft-11';
                // Contribute telemetry data to the project
                if (!serverConfig.greenlock.telemetry) serverConfig.greenlock.telemetry = true;
                // the default servername to use when the client doesn't specify
                // (because some IoT devices don't support servername indication)
                // await localConfig.promptValue('ssl.servername', `Please enter the SSL Server Hostname`, sslConfig.servername || require('os').hostname());

                await interactiveConfig.promptValue('sslPort', `Please enter the Server HTTPS/SSL Port`, serverConfig.sslPort, 'integer');
                // await interactiveConfig.promptValue('httpChallengePort', `Please enter the Server Challenge HTTP Port`, serverConfig.httpChallengePort || serverConfig.httpPort || 8080, 'integer');

                const Greenlock = require('greenlock');

                this.greenlock = Greenlock.create(Object.assign({
                    // Use the approveDomains callback to set per-domain config
                    // (default: approve any domain that passes self-test of built-in challenges)
                    approveDomains: (opts, certs, cb) => this.approveSSLDomains(opts, certs, cb),

                    // If you wish to replace the default account and domain key storage plugin
                    store: require('le-store-certbot').create({
                        configDir: path.join(BASE_DIR, '.acme/etc'),
                        webrootPath: '/tmp/acme-challenges'
                    })
                }, serverConfig.greenlock));

            }

            this.serverConfig = serverConfig;
            let testServer = await interactiveConfig.prompt(`Would you like to test the Server Settings [y or n]?`, false, 'boolean');
            if (testServer) {
                try {
                    await
                    this.createServers();
                    await
                    this.stop();
                    break;
                } catch (e) {
                    console.error(e.message);
                }
            }
        }

        const localConfig = new LocalConfig();
        const allConfig = await localConfig.getAll();
        allConfig.server = serverConfig;
        await localConfig.saveAll();

        return serverConfig;
    }



    getMiddleware() {
        const { DatabaseAPI } = require('../database/database.api');
        const { UserAPI } = require('../user/user.api');
        const { ContentAPI } = require('../content/content.api');
        const { TaskAPI } = require('../task/task.api');

        const router = express.Router();
            // Routes
        router.use(DatabaseAPI.getMiddleware());
        router.use(UserAPI.getMiddleware());
        router.use(ContentAPI.getMiddleware());
        router.use(TaskAPI.getMiddleware());

        return (req, res, next) => {
            return router(req, res, next);
        };
    }

    async createServers() {
        await this.stop();


        // var redir = require('redirect-https')();
        const appHTTP = express();
        // appHTTP.locals.pretty = true;
        const appMiddleware = this.getMiddleware();
        appHTTP.use(appMiddleware);
        this.httpServer = require('http').createServer(appHTTP).listen(this.serverConfig.httpPort, () => {
            console.log(`HTTP listening on port ${this.serverConfig.httpPort}`);
        });

        if (this.serverConfig.sslEnable) {

            const appSSL = express();
            this.sslServer = require('https').createServer(this.greenlock.tlsOptions, appSSL).listen(this.serverConfig.sslPort, () => {
                console.log(`HTTPS listening on port ${this.serverConfig.sslPort}`);
            });

            appSSL.use(appMiddleware);
            appHTTP.use(this.greenlock.middleware());
        }

    }

    async listen() {
        try {
            const { ConfigManager } = require('../config/config.manager');
            await ConfigManager.configure(); // TODO: pass config?

            await this.createServers();
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }

    async stop() {
        if(this.httpServer) {
            // console.log("Closing existing HTTP server ");
            this.httpServer.close();
            this.httpServer = null;
        }
        if(this.sslServer) {
            // console.log("Closing existing SSL server ");
            this.sslServer.close();
            this.sslServer = null;
        }

    }


    approveSSLDomains(opts, certs, cb) {
        // var http01 = require('le-challenge-fs').create({ webrootPath: '/tmp/acme-challenges' });

        // This is where you check your database and associated
        // email addresses with domains and agreements and such
        // if (!isAllowed(opts.domains)) { return cb(new Error("not allowed")); }

        // The domains being approved for the first time are listed in opts.domains
        // Certs being renewed are listed in certs.altnames (if that's useful)

        // Opt-in to submit stats and get important updates
        opts.communityMember = false;

        // var http01 = require('le-challenge-fs').create({ webrootPath: '/tmp/acme-challenges' });
        // If you wish to replace the default challenge plugin, you may do so here
        // opts.challenges = { 'server-01': http01 };

        opts.email = 'admin@' + opts.domain; // this.serverConfig.servername;
        opts.agreeTos = true;

        // NOTE: you can also change other options such as `challengeType` and `challenge`
        // opts.challengeType = 'server-01';
        // opts.challenge = require('le-challenge-fs').create({});

        cb(null, { options: opts, certs: certs });
    }


}

exports.HTTPServer = new HTTPServer();
