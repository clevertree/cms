const UserTable = require("../../user/UserTable");
const UserAPI = require("../../user/UserAPI");
const UserMessageTable = require("./UserMessageTable");
const ContentRenderer = require("../../content/ContentRenderer");


class UserMessageAPI {

    constructor() {
    }


    getMiddleware() {
        const express = require('express');

        const router = express.Router();

        router.all('/[:]user/[:]message/:messageID(\\d+)/[:]json',  async (req, res, next) => await this.renderMessageJSON(req.params.messageID, req, res));
        router.all('/[:]user/[:]message/:messageID(\\d+)',          async (req, res, next) => await this.userMessageRequest(req.params.messageID, req, res));
        router.all('/[:]user/[:]message',                           async (req, res, next) => await this.userMessageSendRequest(null, null, req, res));
        router.all('/[:]user/[:]message/[:]list',                   async (req, res, next) => await this.userMessageListRequest(req, res));
        router.all('/[:]user/:userID(\\w+)/[:]message',             async (req, res, next) => await this.userMessageSendRequest(req.params.userID, req, res));

        return (req, res, next) => {
            if(!req.url.startsWith('/:user'))
                return next();
            return router(req, res, next);
        }
    }

    async sendMessage(req, to, from, subject, body) {
        const userTable = new UserTable(req.database, req.server.dbClient);
        const userMessageTable = new UserMessageTable(req.database, req.server.dbClient);
        let fromUser=null, toUser = await userTable.fetchUserByKey(to);
        if(!toUser)
            throw new Error("'To' User not found: " + to);
        if(from) {
            fromUser = await userTable.fetchUserByKey(from);
            if (!fromUser)
                throw new Error("'From' User not found: " + from);
        }


        const userMessage = await userMessageTable.insertUserMessage(toUser.id, subject, body, fromUser ? fromUser.id : null);
        return userMessage;
        // TODO: send an email
    }

    async userMessageListRequest(req, res) {
        try {
            const userTable = new UserTable(req.database, req.server.dbClient);
            const userMessageTable = new UserMessageTable(req.database, req.server.dbClient);
            switch(req.method) {
                case 'GET':
                    await ContentRenderer.send(req, res, {
                        title: `Messages`,
                        data: `
<user-message-list></user-message-list>
`});
                    break;

                default:
                    switch(req.method) {
                        case 'OPTIONS':
                            if(!req.session || !req.session.userID)
                                throw new Error("Must be logged in");

                            const sessionUser = await userTable.fetchUserByID(req.session.userID);
                            if(!sessionUser)
                                throw new Error("Session User Not Found: " + req.session.userID);
                            // searchJSON.message = `Message: ${messageID}`;
                            const messageList = await userMessageTable.selectUserMessageByUserID(sessionUser.id);

                            return res.json({
                                message: `${messageList.length} message entr${messageList.length !== 1 ? 'ies' : 'y'} queried successfully`,
                                messageList
                            });

                        default:
                        case 'POST':
                            // Handle POST
                            // const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;
                            throw new Error("TODO");

                    }
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    async userMessageRequest(messageID, req, res) {
        try {
            switch(req.method) {
                case 'GET':
                    await ContentRenderer.send(req, res, {
                        title: `Message: ${messageID}`,
                        data: `
<user-message messageID="${messageID}"></user-message>
<user-message-reply messageID="${messageID}"></user-message-reply>
`});
                    break;

                default:
                    switch(req.method) {
                        case 'OPTIONS':
                            // searchJSON.message = `Message: ${messageID}`;
                            return await this.renderMessageJSON(req, res);

                        default:
                        case 'POST':
                            // Handle POST
                            // const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;
                            throw new Error("TODO");

                    }
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }

    async renderMessageJSON(messageID, req, res) {
        try {
            // const userTable = new UserTable(req.database, req.server.dbClient);
            const userMessageTable = new UserMessageTable(req.database, req.server.dbClient);
            const userMessage = await userMessageTable.fetchUserMessageByID(messageID);
            if (!userMessage)
                throw Object.assign(new Error("Message not found: " + messageID), {status: 404});

            return res.json(userMessage);
        } catch (error) {
            await this.renderError(error, req, res);
        }

    }


    async userMessageSendRequest (userID, messageID, req, res) {
        try {
            // const database = await req.server.selectDatabaseByRequest(req);
            const userTable = new UserTable(req.database, req.server.dbClient);
            // const userMessageTable = new UserMessageTable(req.database, req.server.dbClient);

            switch(req.method) {
                case 'GET':
                    await ContentRenderer.send(req, res, {
                        title: `Send a Message`,
                        data: `<user-message-send${userID ? ` to="${userID}"` : ''}></user-message-send>`});
                    break;

                case 'OPTIONS':
                    const searchJSON = await new UserAPI().searchUserList(req);
                    searchJSON.message = "Send a message";
                    return res.json(searchJSON);

                case 'POST':
                    // Handle POST
                    const sessionUser = req.session && req.session.userID ? await userTable.fetchUserByID(req.session.userID) : null;
                    const subject = this.sanitizeInput(req.body.subject);
                    const body = this.sanitizeInput(req.body.body);

                    const userMessage = await this.sendMessage(req,
                        req.body.to,
                        sessionUser ? sessionUser.id : null,
                        subject,
                        body,
                    );
                    // UserMessageTable.insertUserMessage(toUser.id, subject, body, parent_id, sessionUser ? sessionUser.id : null);

                    return res.json({
                        redirect: userMessage.url,
                        message: `Message sent to ${req.body.to} successfully. Redirecting...`,
                        insertID: userMessage.id
                    });
            }
        } catch (error) {
            await this.renderError(error, req, res);
        }
    }

    sanitizeInput(input, type=null) {
        return new UserAPI().sanitizeInput(input, type);
    }

    async renderError(error, req, res, json=null) {
        return new UserAPI().renderError(error, req, res, json);
    }
}
module.exports = UserMessageAPI;