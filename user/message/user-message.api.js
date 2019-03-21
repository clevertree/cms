const { UserAPI } = require('../user.api');
const { DatabaseManager } = require('../../database/database.manager');
const { UserTable } = require('../user.table');
const { UserMessageTable } = require('./user-message.table');
const { ContentRenderer } = require('../../content/content.renderer');


class UserMessageAPI {

    constructor() {
    }


    getMiddleware() {
        const express = require('express');

        const router = express.Router();

        router.all('/[:]user/[:]message/:messageID(\\d+)',          async (req, res, next) => await this.userMessageRequest(req.params.messageID, req, res));
        router.all('/[:]user/[:]message',                           async (req, res, next) => await this.userMessageSendRequest(null, req, res));
        router.all('/[:]user/:userID(\\w+)/[:]message',             async (req, res, next) => await this.userMessageSendRequest(req.params.userID, req, res));

        return (req, res, next) => {
            return router(req, res, next);
        }
    }

    async userMessageRequest(messageID, req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userTable = new UserTable(database);
            const userMessageTable = new UserMessageTable(database);

            switch(req.method) {
                case 'GET':
                    await ContentRenderer.send(req, res, {
                        title: `Message: ${messageID}`,
                        data: `<user-form-message${messageID ? ` messageID="${messageID}"` : ''}></user-form-message-send>`});
                    break;

                case 'OPTIONS':
                    const userMessage = await userMessageTable.fetchUserMessageByID(messageID);
                    // searchJSON.message = `Message: ${messageID}`;
                    return res.json(userMessage);

                case 'POST':
                    // Handle POST
                    const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;

                    // TODO: Delete Message + reply

                    return res.json({
                        redirect: userMessage.url,
                        message: `Message sent to ${toUser.username} successfully. Redirecting...`,
                        insertID: userMessage.id
                    });
            }
        } catch (error) {
            await UserAPI.renderError(error, req, res);
        }

    }


    async userMessageSendRequest (userID, req, res) {
        try {
            const database = await DatabaseManager.selectDatabaseByRequest(req);
            const userTable = new UserTable(database);
            const userMessageTable = new UserMessageTable(database);

            switch(req.method) {
                case 'GET':
                    await ContentRenderer.send(req, res, {
                        title: `Send a Message`,
                        data: `<user-form-message-send${userID ? ` to="${userID}"` : ''}></user-form-message-send>`});
                    break;

                case 'OPTIONS':
                    const searchJSON = await UserAPI.searchUserList(req);
                    searchJSON.message = "Send a message";
                    return res.json(searchJSON);

                case 'POST':
                    // Handle POST
                    const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;

                    // TODO: for loop
                    const toUser = await userTable.fetchUserByKey(req.body.to); // TODO: test match against userID
                    if(!toUser)
                        throw new Error("User not found: " + req.body.to);

                    const from = UserAPI.sanitizeInput(req.body.from, 'email') ;
                    const subject = UserAPI.sanitizeInput(req.body.subject, 'text') ;
                    let body = UserAPI.sanitizeInput(req.body.body, 'text') ;
                    const parent_id = req.body.parent_id ? parseInt(req.body.parent_id) : null;
                    if(from)
                        body = `From: ${from}\n\n` + body;

                    const userMessage = await userMessageTable.insertUserMessage(toUser.id, subject, body, parent_id, sessionUser ? sessionUser.id : null);

                    // TODO: send an email

                    return res.json({
                        redirect: userMessage.url,
                        message: `Message sent to ${toUser.username} successfully. Redirecting...`,
                        insertID: userMessage.id
                    });
            }
        } catch (error) {
            await UserAPI.renderError(error, req, res);
        }
    }

}
module.exports = { UserMessageAPI: new UserMessageAPI() };