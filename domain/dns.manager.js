const whois = require('whois');
const http = require('http');
const https = require('https');

class DNSManager {
    constructor() {
    }


    async queryDNSAdmin(hostname) {
        // hostname  = 'clevertree.net';
        const data = await this.queryWHOISData(hostname);
        // Admin Email: ari.asulin@gmail.com
        let regEmail = /admin.*\s+([-.\w]+@(?:[\w-]+\.)+[\w-]{2,20})/i;
        let matches = regEmail.exec(data);
        if(matches)
            return matches[1];

        let regRedirect = /^Admin Email: Select Contact Domain Holder link at (.*)$/m;
        matches = regRedirect.exec(data);
        if(matches){
            const redirectURL = matches[1];
            const redirectResponse = await this.getURLContent(redirectURL);
            matches = regEmail.exec(redirectResponse);
            if(matches)
                return matches[1];
            console.log("Redirect URL detected, but captcha might be required:\n", redirectURL);
        }

        return null;
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