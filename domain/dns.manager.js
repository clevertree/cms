const whois = require('whois');
const http = require('http');
const https = require('https');

class DNSManager {
    constructor() {
    }


    async queryHostAdminEmailAddresses(hostname) {
        const emailAddresses = [];
        console.info("Querying WHOIS for admin email: " + hostname);

        const result = await new Promise(function (resolve, reject) {
            const dns = require('dns');
            dns.resolveSoa(hostname, function (err, records) {
                if(err)
                    console.error(`Hostname SOA failed for ${hostname}: `, err);
                resolve(records);
            });
        });
        if(result && result.hostmaster) {
            console.info(result);
            emailAddresses.push(result.hostmaster
                .replace('\\.', '><')
                .replace(/\./, '@')
                .replace('><', '.'));
        }



        // hostname  = 'clevertree.net';
        const data = await this.queryWHOISData(hostname);
        // Admin Email: ari.asulin@gmail.com
        let regEmail = /admin.*\s+([-.\w]+@(?:[\w-]+\.)+[\w-]{2,20})/i;
        let matches = regEmail.exec(data);
        if(matches)
            emailAddresses.push(matches[1]);

        let regRedirect = /^Admin Email: Select Contact Domain Holder link at (.*)$/m;
        matches = regRedirect.exec(data);
        if(matches){
            const redirectURL = matches[1];
            const redirectResponse = await this.getURLContent(redirectURL);
            matches = regEmail.exec(redirectResponse);
            if(matches)
                emailAddresses.push(matches[1]);
            else
                console.warn("Redirect URL detected, but captcha might be required:\n" + redirectURL);
        }

        return emailAddresses;
        // throw new Error("No admin email found in WHOIS Information for: " + hostname);
    }

    async queryWHOISData(hostname) {
        return new Promise( ( resolve, reject ) => {
            whois.lookup(hostname, {
                // "server":  "",   // this can be a string ("host:port") or an object with host and port as its keys; leaving it empty makes lookup rely on servers.json
                "follow":  2,    // number of times to follow redirects
                // "timeout": 2,    // socket timeout, excluding this doesn't override any default timeout value
                // "verbose": true, // setting this to true returns an array of responses from all servers
                // "bind": null,     // bind the socket to a local IP address
                // "proxy": {       // (optional) SOCKS Proxy
                //     "ipaddress": "",
                //     "port": 0,
                //     "type": 5    // or 4
                // }
            }, function(err, data) {
                err ? reject(err) : resolve (data);
            });
        });
    }

    async getURLContent(url) {
        return new Promise( ( resolve, reject ) => {
            const client = (url.toString().indexOf("https") === 0) ? https : http;
            client.get(url, function(res) {
                if(res.statusCode !== 200)
                    return reject("Error: " + res.statusCode);

                res.setEncoding('utf8');
                let buffer = '';
                res.on('data',  chunk => buffer += chunk);
                res.on('end',   () => resolve(buffer));
            }).on('error', function(e) {
                console.log("Got error: " + e.message);
                reject(e);
            });
        });
    }



}



exports.DNSManager = new DNSManager();