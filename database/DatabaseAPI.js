const express = require('express');

const UserTable = require('../user/UserTable');
const ContentRenderer = require('../content/ContentRenderer');
const SessionAPI = require("../user/session/SessionAPI");


class DatabaseAPI {
    constructor() {
    }


    getMiddleware() {
        // Configure Routes
        let router = express.Router();
        router.use(express.urlencoded({ extended: true }));
        router.use(express.json());
        // router.use(new SessionAPI().getMiddleware());

        // Handle Database requests
        router.get('/[:]database/[:]json',                    async (req, res) => await this.renderDatabaseJSON(req, res));
        router.all('/[:]database(/[:]edit)?',                 async (req, res) => await this.renderDatabaseClient(req, res));
        router.all('/[:]database/[:]connect',                 async (req, res) => await this.renderDatabaseConnectForm(req, res));

        const routerMissingDB = express.Router();
        routerMissingDB.use(express.urlencoded({ extended: true }));
        routerMissingDB.use(express.json());
        routerMissingDB.use(async (req, res) => await this.renderDatabaseConnectForm(req, res));


        return (req, res, next) => {
            if(req.url.startsWith('/:database'))
                return router(req, res, next);
            if(req.server.dbClient.isConnected())
                return next();
            if(req.url === '/')
                return routerMissingDB(req, res, next);
            return next();
        }
    }

    async renderDatabaseJSON(req, res) {
        try {
            // const database = await req.server.selectDatabaseByRequest(req);
            const userTable = new UserTable(req.database, req.server.dbClient);
            const databaseDB = req.server.dbClient.getDatabaseDB(req);
            const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;
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
            await this.renderError(error, req, res);
        }
    }

    async renderDatabaseClient(req, res) {
        try {

            if (req.method === 'GET') {
                await ContentRenderer.send(req, res, {
                    title: `Manage Database`,
                    data: `<database-manage></database-manage>`
                });
            } else {
                // Handle POST
                const database = await req.server.selectDatabaseByRequest(req);
                const userTable = new UserTable(req.database, req.server.dbClient);
                const databaseDB = req.server.dbClient.getDatabaseDB(database);

                const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;
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
            await this.renderError(error, req, res);
        }
    }

    async renderDatabaseConnectForm(req, res) {
        try {

            if (req.method === 'GET') {
                await ContentRenderer.send(req, res, {
                    title: `Connect to Database`,
                    data: `<database-connect></database-connect>`
                });

            } else {
                // Handle POST
                if(req.server.dbClient.isAvailable())
                    throw new Error("Database is already connected");
                // await DatabaseClient.configure(req.body);

                return res.json({
                    redirect: '/:database',
                    message: `<div class='success'>Database Configured Successfully!</div>`,
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


module.exports = DatabaseAPI;

