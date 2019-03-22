const UserAPI = require('../UserAPI');
const DatabaseManager = require('../../database/DatabaseManager');
const UserTable = require('../UserTable');
const UserMessageTable = require('./UserMessageTable');
const ContentRenderer = require('../../content/ContentRenderer');


class UserMessageAPI {

    constructor() {
    }


    getMiddleware() {
        const express = require('express');

        const router = express.Router();

        router.all('/[:]user/[:]message/:messageID(\\d+)',          async (req, res, next) => await this.userMessageRequest(req.params.messageID, req, res));
        router.all('/[:]user/[:]message/:messageID(\\d+)/:reply',   async (req, res, next) => await this.userMessageSendRequest(null, req.params.messageID, req, res));
        router.all('/[:]user/[:]message',                           async (req, res, next) => await this.userMessageSendRequest(null, null, req, res));
        router.all('/[:]user/:userID(\\w+)/[:]message',             async (req, res, next) => await this.userMessageSendRequest(req.params.userID, req, res));

        return (req, res, next) => {
            return router(req, res, next);
        }
    }

    async sendMessage(database, to, from, subject, body, parent_id) {
        const userTable = new UserTable(database);
        const UserMessageTable = new UserMessageTable(database);
        const toUser = await userTable.fetchUserByKey(to);
        if(!toUser)
            throw new Error("User not found: " + to);
        const fromUser = await userTable.fetchUserByKey(from);
        if(!fromUser) {
            from = UserAPI.sanitizeInput(from, 'email') ;
            body = `From: ${from}\n\n` + body;
        }


        const userMessage = await UserMessageTable.insertUserMessage(toUser.id, subject, body, parent_id, fromUser ? fromUser.id : null);
        return userMessage;
        // TODO: send an email
    }

    async userMessageRequest(messageID, req, res) {
        try {
            const database = await req.server.selectDatabaseByRequest(req);
            const userTable = new UserTable(database);
            const UserMessageTable = new UserMessageTable(database);

            switch(req.method) {
                case 'GET':
                    await ContentRenderer.send(req, res, {
                        title: `Message: ${messageID}`,
                        data: `<user-form-message${messageID ? ` messageID="${messageID}"` : ''}></user-form-message-send>`});
                    break;

                case 'OPTIONS':
                    const userMessage = await UserMessageTable.fetchUserMessageByID(messageID);
                    // searchJSON.message = `Message: ${messageID}`;
                    return res.json(userMessage);

                case 'POST':
                    // Handle POST
                    const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;

                    const userMessageReply = await this.sendMessage(database,
                        req.body.to,
                        sessionUser ? sessionUser.id : req.body.from,
                        req.body.subject,
                        req.body.body,
                        req.body.parent_id ? parseInt(req.body.parent_id) : null
                    );
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


    async userMessageSendRequest (userID, messageID, req, res) {
        try {
            const database = await req.server.selectDatabaseByRequest(req);
            const userTable = new UserTable(database);
            const UserMessageTable = new UserMessageTable(database);

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

                    const userMessage = await this.sendMessage(database,
                        req.body.to,
                        sessionUser ? sessionUser.id : req.body.from,
                        req.body.subject,
                        req.body.body,
                        req.body.parent_id ? parseInt(req.body.parent_id) : null
                        );
                    // UserMessageTable.insertUserMessage(toUser.id, subject, body, parent_id, sessionUser ? sessionUser.id : null);

                    return res.json({
                        redirect: userMessage.url,
                        message: `Message sent to ${req.body.to} successfully. Redirecting...`,
                        insertID: userMessage.id
                    });
            }
        } catch (error) {
            await UserAPI.renderError(error, req, res);
        }
    }

}
module.exports = UserMessageAPI;