const express = require('express');
const path = require('path');
const os = require('os')

const { LocalConfig } = require('../../config/local.config');
const { HTTPServer } = require('./http.server');

const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));

class SSLServer {
    constructor() {
        this.config = null;
        this.greenlock = null;
    }

    async configure(promptCallback=null) {
        // const httpConfig = await HTTPServer.configure(config);

        // Configure SSL
        const localConfig = new LocalConfig(promptCallback);
        const sslConfig = await localConfig.getOrCreate('ssl');
        // const serverConfig = await localConfig.getOrCreate('server');
        if(!sslConfig.server)           sslConfig.server = 'https://acme-v02.api.letsencrypt.org/directory';
        // Note: If at first you don't succeed, stop and switch to staging:
        // https://acme-staging-v02.api.letsencrypt.org/directory
        if(!sslConfig.version)          sslConfig.version = 'draft-11';
        // Contribute telemetry data to the project
        if(!sslConfig.telemetry)        sslConfig.telemetry = true;
        // the default servername to use when the client doesn't specify
        // (because some IoT devices don't support servername indication)
        // await localConfig.promptValue('ssl.servername', `Please enter the SSL Server Hostname`, sslConfig.servername || require('os').hostname());

        await localConfig.promptValue('ssl.sslPort', `Please enter the Server HTTPS/SSL Port`, sslConfig.sslPort || 443, 'integer');
        await localConfig.promptValue('ssl.httpPort', `Please enter the Server Challenge HTTP Port`, sslConfig.httpPort || 8080, 'integer');
        await localConfig.saveAll();

        // if(!sslConfig.store)
        //     sslConfig.store = require('le-store-certbot').create({
        //         configDir: require('path').join(require('os').homedir(), 'acme', 'etc')
        //         , webrootPath: '/tmp/acme-challenges'
        //     });

        const Greenlock = require('greenlock');

        this.greenlock = Greenlock.create(Object.assign({
            version: 'draft-12'
            , server: 'https://acme-v02.api.letsencrypt.org/directory'

            // Use the approveDomains callback to set per-domain config
            // (default: approve any domain that passes self-test of built-in challenges)
            , approveDomains: (opts, certs, cb) => this.approveDomains(opts, certs, cb)

            // the default servername to use when the client doesn't specify
            // , servername: 'example.com'

            // If you wish to replace the default account and domain key storage plugin
            , store: require('le-store-certbot').create({
                configDir: path.join(BASE_DIR, '.acme/etc')
                , webrootPath: '/tmp/acme-challenges'
            })
        }, sslConfig));



        this.config = sslConfig;
        return sslConfig;
    }

    approveDomains(opts, certs, cb) {
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

    async listen() {
        const sslConfig = await this.configure();


        // var redir = require('redirect-https')();
        const appHTTP = express();
        const appMiddleware = HTTPServer.getMiddleware();
        appHTTP.use(this.greenlock.middleware());
        appHTTP.use(appMiddleware);
        const serverHTTP = require('http').createServer(appHTTP).listen(sslConfig.httpPort, function(e) {
            console.log(`HTTP listening on port ${sslConfig.httpPort}`);
        });
        serverHTTP.on('error', (e) => console.log(e) );

        const appSSL = express();
        appSSL.use(appMiddleware);
        const serverSSL = require('https').createServer(this.greenlock.tlsOptions, appSSL).listen(sslConfig.sslPort, function(e) {
            console.log(`HTTPS listening on port ${sslConfig.sslPort}`);
        });
        serverSSL.on('error', (e) => console.log(e) );

    }
}

exports.SSLServer = new SSLServer();
