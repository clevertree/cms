const fs = require('fs');
const path = require('path');
const express = require('express');
// var qs = require('qs');
// var parseUrl = require('parseurl');

const { LocalConfig } = require('../../config/local.config');
// const { ConfigManager } = require('../../config/config.manager');

// const { TaskAPI } = require('../task/task.manager');
// const { DatabaseManager } = require('../../database/database.manager');
const { DatabaseAPI } = require('../../database/database.api');
const { UserAPI } = require('../../user/user.api');
const { ArticleAPI } = require('../../article/article.api');
const { FileAPI } = require('../file/file.api');
const { ConfigAPI } = require('../../config/config.api');
const { TaskAPI } = require('../task/task.api');

const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));

class HTTPServer {
    constructor() {
        this.httpServer = null;
        this.sslServer = null;
        this.config = null;
    }

    async configure(promptCallback=null) {

        const localConfig = new LocalConfig(promptCallback);
        const serverConfig = await localConfig.getOrCreate('server');
        // const defaultHostname     = (require('os').hostname()).toLowerCase();

        let attempts = promptCallback ? 3 : 1;
        while(attempts-- > 0) {
            await localConfig.promptValue('server.httpPort', `Please enter the Server HTTP Port`, serverConfig.httpPort || 8080, 'integer');
            await localConfig.promptValue('server.sslEnable', `Enable SSL Server with GreenLock [y or n]?`, serverConfig.sslEnable || true, 'boolean');

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

                await localConfig.promptValue('server.sslPort', `Please enter the Server HTTPS/SSL Port`, serverConfig.sslPort || 8443, 'integer');
                // await localConfig.promptValue('server.httpChallengePort', `Please enter the Server Challenge HTTP Port`, serverConfig.httpChallengePort || serverConfig.httpPort || 8080, 'integer');

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

            this.config = serverConfig;
            try {
                await this.createServers();
                await this.stop();
                break;
            } catch (e) {
                console.error(e.message);
            }
        }
        await localConfig.saveAll();

        return serverConfig;
    }



    getMiddleware() {
        const router = express.Router();
        // Routes
        router.use(DatabaseAPI.getMiddleware());
        router.use(UserAPI.getMiddleware());
        router.use(ArticleAPI.getMiddleware());
        router.use(FileAPI.getMiddleware());
        router.use(ConfigAPI.getMiddleware());
        router.use(TaskAPI.getMiddleware());


        // CMS Asset files
        router.use(express.static(BASE_DIR));

        return (req, res, next) => {
            return router(req, res, next);
        };
    }

    async createServers() {
        await this.stop();


        // var redir = require('redirect-https')();
        const appHTTP = express();
        const appMiddleware = this.getMiddleware();
        this.httpServer = require('http').createServer(appHTTP).listen(this.config.httpPort, () => {
            console.log(`HTTP listening on port ${this.config.httpPort}`);
        });
        this.httpServer.on('error', (e) => console.log(e) );

        if (this.config.sslEnable) {

            const appSSL = express();
            this.sslServer = require('https').createServer(this.greenlock.tlsOptions, appSSL).listen(this.config.sslPort, () => {
                console.log(`HTTPS listening on port ${this.config.sslPort}`);
            });
            this.sslServer.on('error', (e) => console.log(e));

            appSSL.use(appMiddleware);
            appHTTP.use(this.greenlock.middleware());
        }

        appHTTP.use(appMiddleware);
    }

    async listen() {
        try {
            if(!this.config)
                await this.configure();

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
        opts.communityMember = true;

        // var http01 = require('le-challenge-fs').create({ webrootPath: '/tmp/acme-challenges' });
        // If you wish to replace the default challenge plugin, you may do so here
        // opts.challenges = { 'http-01': http01 };

        opts.email = 'admin@' + opts.domain; // this.config.servername;
        opts.agreeTos = true;

        // NOTE: you can also change other options such as `challengeType` and `challenge`
        // opts.challengeType = 'http-01';
        // opts.challenge = require('le-challenge-fs').create({});

        cb(null, { options: opts, certs: certs });
    }

}

exports.HTTPServer = new HTTPServer();
