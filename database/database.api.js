const express = require('express');

const { DatabaseManager } = require('./database.manager');

class DatabaseAPI {
    constructor() {
        this.router = null;
        this.routerMissingDB = null;
    }


    getMiddleware() {
        if(!this.router)
            this.configure();

        return (req, res, next) => {
            if(!req.url.startsWith('/:database'))
                return this.router(req, res, next);
            if(!DatabaseManager.isConnected)
                return this.routerMissingDB(req, res, next);
            return next();
        }
    }

    async configure() {
        // Configure Routes
        let router = express.Router();
        const bodyParser = require('body-parser');
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());
        router.use(UserAPI.getSessionMiddleware());

        // Handle Database requests
        router.get('/[:]database/[:]json',                    async (req, res) => await this.renderDatabaseJSON(req, res));
        router.all('/[:]database(/[:]edit)?',                 async (req, res) => await this.renderDatabaseEditor(req, res));
        this.router = router;

        router = express.Router();
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());
        router.use(async (req, res) => await this.renderMissingDatabaseManager(req, res));

        this.routerMissingDB = router;


        await DatabaseManager.configure();
    }

    async renderDatabaseJSON(req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userDB = await DatabaseManager.getUserDB(database);
            const databaseDB = await DatabaseManager.getDatabaseDB(database);
            const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
            if(!sessionUser || !sessionUser.isAdmin())
                throw new Error("Not authorized");

            // Handle POST
            let whereSQL = '1', values = null;
            if(req.body.search) {
                whereSQL = 'c.name LIKE ?';
                values = ['%'+req.body.search+'%'];
            }
            const databaseList = await databaseDB.selectDatabases(whereSQL, values);
            // const database = await databaseDB.parseDatabaseValues(databaseList);

            return res.json({
                message: `${databaseList.length} Database${databaseList.length !== 1 ? 's' : ''} queried successfully`,
                database,
                databaseList,
            });
        } catch (error) {
            console.log(error);
            res.status(400);
            return res.json({
                message: `<div class='error'>${error.message || error}</div>`,
                error: error.stack
            });
        }
    }

    async renderDatabaseEditor(req, res) {
        try {

            if (req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<section>
    <script src="/database/form/databaseform-editor.client.js"></script>
    <databaseform-editor></databaseform-editor>
</section>
`)
                );

            } else {
                // Handle POST
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = await DatabaseManager.getUserDB(database);
                const databaseDB = await DatabaseManager.getDatabaseDB(database);

                const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
                if(!sessionUser || !sessionUser.isAdmin())
                    throw new Error("Not authorized");

                let databaseChanges = req.body, databaseUpdateList=[];
                for(let databaseName in databaseChanges) {
                    if(databaseChanges.hasOwnProperty(databaseName)) {
                        const databaseEntry = await databaseDB.fetchDatabaseValue(databaseName)
                        if(!databaseEntry)
                            throw new Error("Database entry not found: " + databaseName);
                        if(databaseChanges[databaseName] !== databaseEntry)
                            databaseUpdateList.push([databaseName, databaseChanges[databaseName]])
                    }
                }
                for(let i=0; i<databaseUpdateList.length; i++) {
                    await databaseDB.updateDatabaseValue(databaseUpdateList[i][0], databaseUpdateList[i][1])
                }


                const databaseList = await databaseDB.selectDatabases('1');
                return res.json({
                    message: `<div class='success'>${databaseUpdateList.length} Database${databaseUpdateList.length !== 1 ? 's' : ''} updated successfully</div>`,
                    databaseList
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

    async renderMissingDatabaseManager(req, res) {
        try {

            if (req.method === 'GET') {
                res.send(
                    await ThemeManager.get()
                        .render(req, `
<section>
    <script src="/database/form/databaseform-editor.client.js"></script>
    <databaseform-editor></databaseform-editor>
</section>
`)
                );

            } else {
                // Handle POST
                const database = await DatabaseManager.selectDatabaseByRequest(req);
                const userDB = await DatabaseManager.getUserDB(database);
                const databaseDB = await DatabaseManager.getDatabaseDB(database);

                const sessionUser = req.session && req.session.userID ? await userDB.fetchUserByID(req.session.userID) : null;
                if(!sessionUser || !sessionUser.isAdmin())
                    throw new Error("Not authorized");

                let databaseChanges = req.body, databaseUpdateList=[];
                for(let databaseName in databaseChanges) {
                    if(databaseChanges.hasOwnProperty(databaseName)) {
                        const databaseEntry = await databaseDB.fetchDatabaseValue(databaseName)
                        if(!databaseEntry)
                            throw new Error("Database entry not found: " + databaseName);
                        if(databaseChanges[databaseName] !== databaseEntry)
                            databaseUpdateList.push([databaseName, databaseChanges[databaseName]])
                    }
                }
                for(let i=0; i<databaseUpdateList.length; i++) {
                    await databaseDB.updateDatabaseValue(databaseUpdateList[i][0], databaseUpdateList[i][1])
                }


                const databaseList = await databaseDB.selectDatabases('1');
                return res.json({
                    message: `<div class='success'>${databaseUpdateList.length} Database${databaseUpdateList.length !== 1 ? 's' : ''} updated successfully</div>`,
                    databaseList
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


module.exports = {DatabaseAPI: new DatabaseAPI()};

