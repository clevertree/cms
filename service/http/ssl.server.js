const express = require('express');
const path = require('path');

const { LocalConfig } = require('../../config/local.config');
const { HTTPServer } = require('./http.server');

const BASE_DIR = path.resolve(path.dirname(path.dirname(__dirname)));

class SSLServer {
    constructor() {
        this.config = null;
        this.server = null;
    }

    async configure(config=null) {
        const httpConfig = await HTTPServer.configure(config);

        // Configure SSL
        const localConfig = new LocalConfig(config, !config);
        const sslConfig = await localConfig.getOrCreate('ssl');
        if(!sslConfig.server)           sslConfig.server = 'https://acme-v02.api.letsencrypt.org/directory';
        // Note: If at first you don't succeed, stop and switch to staging:
        // https://acme-staging-v02.api.letsencrypt.org/directory
        if(!sslConfig.version)          sslConfig.version = 'draft-11';
        // Contribute telemetry data to the project
        if(!sslConfig.telemetry)        sslConfig.telemetry = true;
        // the default servername to use when the client doesn't specify
        // (because some IoT devices don't support servername indication)
        if(!sslConfig.servername)       sslConfig.servername = httpConfig.hostname;
        if(!sslConfig.servername)       await localConfig.promptValue('ssl.servername', `Please enter the SSL Server Hostname`, require('os').hostname());
        if(!sslConfig.port)             sslConfig.port = httpConfig.port;
        if(!sslConfig.port)             await localConfig.promptValue('ssl.port', `Please enter the SSL Server Port`, 443);
        // if(!sslConfig.store)
        //     sslConfig.store = require('le-store-certbot').create({
        //         configDir: require('path').join(require('os').homedir(), 'acme', 'etc')
        //         , webrootPath: '/tmp/acme-challenges'
        //     });

        this.server = require('greenlock-express').create(Object.assign({
            approveDomains: (opts, certs, cb) => this.approveDomains(opts, certs, cb),
            app: HTTPServer.getMiddleware(),
            debug: true,
            store: require('le-store-certbot').create({
                    configDir: path.join(BASE_DIR, '.acme', 'etc')
                    // , privkeyPath: ':configDir/live/:hostname/privkey.pem'          //
                    // , fullchainPath: ':configDir/live/:hostname/fullchain.pem'      // Note: both that :configDir and :hostname
                    // , certPath: ':configDir/live/:hostname/cert.pem'                //       will be templated as expected by
                    // , chainPath: ':configDir/live/:hostname/chain.pem'              //       greenlock.js

                    , logsDir: ':configDir/log'

                    // , webrootPath: '~/acme/srv/www/:hostname/.well-known/acme-challenge'

                // , webrootPath: '/tmp/acme-challenges'
                    })
        }, sslConfig));

        this.config = sslConfig;
        return sslConfig;
    }

    approveDomains(opts, certs, cb) {
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

        opts.email = 'john.doe@' + this.config.servername;
        opts.agreeTos = true;

        // NOTE: you can also change other options such as `challengeType` and `challenge`
        // opts.challengeType = 'http-01';
        // opts.challenge = require('le-challenge-fs').create({});

        cb(null, { options: opts, certs: certs });
    }

    async listen() {
        const config = await this.configure();


        const app = this.server.listen(80, 443, function () {
            console.log("Listening on port 80 for ACME challenges and 443 for express app.");
        });

        return app;
    }
}

exports.SSLServer = new SSLServer();
