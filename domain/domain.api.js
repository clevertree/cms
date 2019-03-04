const express = require('express');

const { DatabaseManager } = require('../database/database.manager');
const { ThemeAPI } = require('../theme/theme.api');
const { DomainDatabase } = require("./domain.database");
// const { ContentDatabase } = require("../article/article.database");
const { UserDatabase } = require("../user/user.database");
const { UserAPI } = require('../user/user.api');
const { SessionAPI } = require('../service/session/session.api');

class DomainAPI {
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
        const bodyParser = require('body-parser');
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());
        router.use(SessionAPI.getMiddleware());

        // Handle Domain requests
        router.get('/[:]domain/[:]json',                    async (req, res) => await this.renderDomainJSON(req, res));
        router.all('/[:]domain(/[:]edit)?',                 async (req, res) => await this.renderDomainEditor(req, res));
        this.router = router;
    }


    async renderDomainJSON(req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = new UserDatabase(database);
            const domainDB = new DomainDatabase(database);
            const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
            if(!sessionUser || !sessionUser.isAdmin())
                throw new Error("Not authorized");

            // Handle POST
            let whereSQL = '1', values = null;
            if(req.body.search) {
                whereSQL = 'd.name LIKE ?';
                values = ['%'+req.body.search+'%'];
            }
            const domainList = await domainDB.selectDomains(whereSQL, values);
            const domain = await domainDB.parseDomainValues(domainList);

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
                await ThemeAPI.send(req, res, `
<section>
    <script src="/domain/form/domainform-editor.element.js"></script>
    <domainform-editor></domainform-editor>
</section>
`);
            } else {
                // Handle POST
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = new UserDatabase(database);
                const domainDB = new DomainDatabase(database);

                const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
                if(!sessionUser || !sessionUser.isAdmin())
                    throw new Error("Not authorized");

                let domainChanges = req.body, domainUpdateList=[];
                for(let domainName in domainChanges) {
                    if(domainChanges.hasOwnProperty(domainName)) {
                        const domainEntry = await domainDB.fetchDomainValue(domainName)
                        if(!domainEntry)
                            throw new Error("Domain entry not found: " + domainName);
                        if(domainChanges[domainName] !== domainEntry)
                            domainUpdateList.push([domainName, domainChanges[domainName]])
                    }
                }
                for(let i=0; i<domainUpdateList.length; i++) {
                    await domainDB.updateDomainValue(domainUpdateList[i][0], domainUpdateList[i][1])
                }


                const domainList = await domainDB.selectDomains('1');
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
        console.error(`${req.method} ${req.url} ${error.message}`);
        res.status(400);
        if(error.redirect) {
            res.redirect(error.redirect);
        } else if(req.method === 'GET' && !json) {
            await ThemeAPI.send(req, res, `<section class='error'><pre>${error.stack}</pre></section>`);
        } else {
            res.json(Object.assign({}, {
                message: `${req.method} ${req.url} ${error.message}`,
                error: error.stack,
                code: error.code,
            }, json));
        }
    }

}


module.exports = {DomainAPI: new DomainAPI()};

