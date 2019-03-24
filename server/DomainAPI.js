const express = require('express');

const ContentRenderer = require('../content/ContentRenderer');
const UserTable = require("../user/UserTable");
// const SessionAPI = require("../user/session/SessionAPI");


class domainAPI {
    constructor() {
        this.router = null;
    }


    getMiddleware() {
        if(!this.router)
            this.configure();

        return (req, res, next) => {
            if(!req.url.startsWith('/:domain'))
                return next();
            return this.router(req, res, next);
        }
    }

    async configure() {
        // Configure Routes
        const router = express.Router();
        router.use(express.urlencoded({ extended: true }));
        router.use(express.json());
        // router.use(new SessionAPI().getMiddleware());

        // Handle Domain requests
        router.get('/[:]domain/[:]json',                    async (req, res) => await this.renderDomainJSON(req, res));
        router.all('/[:]domain(/[:]edit)?',                 async (req, res) => await this.renderDomainEditor(req, res));
        this.router = router;
    }


    async renderDomainJSON(req, res) {
        try {
            const database = await req.server.selectDatabaseByRequest(req);
            const userTable = new UserTable(req.database, req.server.dbClient);
            const DomainTable = new DomainTable(database);
            const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;
            if(!sessionUser || !sessionUser.isAdmin())
                throw new Error("Not authorized");

            // Handle POST
            let whereSQL = '1', values = null;
            if(req.body.search) {
                whereSQL = 'd.name LIKE ?';
                values = ['%'+req.body.search+'%'];
            }
            const domainList = await DomainTable.selectDomains(whereSQL, values);
            const domain = await DomainTable.parseDomainValues(domainList);

            return res.json({
                message: `${domainList.length} Domain${domainList.length !== 1 ? 's' : ''} queried successfully`,
                domain,
                domainList,
            });
        } catch (error) {
            await this.renderError(error, req, res, {});
        }
    }

    async renderDomainEditor(req, res) {
        try {

            if (req.method === 'GET') {
                await ContentRenderer.send(req, res, {
                    title: `Manage Domain`,
                    data: `<domainform-editor></domainform-editor>`
            });
            } else {
                // Handle POST
                const database = await req.server.selectDatabaseByRequest(req);
                const userTable = new UserTable(req.database, req.server.dbClient);
                const DomainTable = new DomainTable(database);

                const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;
                if(!sessionUser || !sessionUser.isAdmin())
                    throw new Error("Not authorized");

                let domainChanges = req.body, domainUpdateList=[];
                for(let domainName in domainChanges) {
                    if(domainChanges.hasOwnProperty(domainName)) {
                        const domainEntry = await DomainTable.fetchDomainValue(domainName)
                        if(!domainEntry)
                            throw new Error("Domain entry not found: " + domainName);
                        if(domainChanges[domainName] !== domainEntry)
                            domainUpdateList.push([domainName, domainChanges[domainName]])
                    }
                }
                for(let i=0; i<domainUpdateList.length; i++) {
                    await DomainTable.updateDomainValue(domainUpdateList[i][0], domainUpdateList[i][1])
                }


                const domainList = await DomainTable.selectDomains('1');
                return res.json({
                    message: `<div class='success'>${domainUpdateList.length} Domain${domainUpdateList.length !== 1 ? 's' : ''} updated successfully</div>`,
                    domainList
                });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }


    async renderError(error, req, res, json=null) {
        console.error(`${req.method} ${req.url}:`, error);
        res.status(400);
        if(error.redirect) {
            res.redirect(error.redirect);
        } else if(req.method === 'GET' && !json) {
            await ContentRenderer.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
        } else {
            res.json(Object.assign({}, {
                message: error.message,
                error: error.stack,
                code: error.code,
            }, json));
        }
    }

}


module.exports = {domainAPI: new domainAPI()};

