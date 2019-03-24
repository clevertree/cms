const uuidv4 = require('uuid/v4');

const UserAPI = require("../../user/UserAPI");
const UserTable = require("../../user/UserTable");
const ConfigureDatabaseMail = require('../mail/ConfigureDatabaseMail');

const configureRequests = {};

class databaseConfigureTask {
    constructor(database) {
        // Null domain means domain hasn't been configured yet
        this.database = database;
    }

    static getTaskName() {
        return 'database-configure';
    }


    async isActive(req, sessionUser=null) {
        if(!req.server.dbClient.isMultipleDomainMode())
            return false;

        let hostname = req.server.dbClient.getHostnameFromRequest(req);

        const DomainTable = req.server.dbClient.getPrimaryDomainTable();
        const domain = await DomainTable.fetchDomainByHostname(hostname);
        if(!domain) {
            console.warn("TODO: Domain entry missing. Shouldn't happen");
            return false;
        }
        if(!domain.database)
            return true;

        // TODO: check to see if database exists. If the domain entry is missing, then it's active
        const databaseResult = await req.server.dbClient.queryAsync(`SHOW DATABASES LIKE '${domain.database}'`);
        if(databaseResult.length > 0)
            return false;

        // TODO: task also applies to database connection problems
        // console.warn(`Database User Not Found in ${this.database}`);
        return true;
    }



    async renderFormHTML(req, sessionUser=null) {
        const taskName = databaseConfigureTask.getTaskName();
        const hostname = (req.get ? req.get('host') : req.headers.host).split(':')[0];
        let status = 0;
        let message = `Configure Database for ${hostname}`;
        let isActive = await this.isActive(req, sessionUser);

        const defaultDatabaseName = hostname.replace('.', '_') + '_cms';

        // const isAdmin = sessionUser && sessionUser.isAdmin();

        let requestUUID = null, selectedAdminEmail = null, requestData = {}, dnsAdminEmails = [];
        try {
            if (!isActive)
                throw new Error("This task is not active");

            dnsAdminEmails = await UserAPI.queryAdminEmailAddresses(null, hostname);

            if (typeof req.query.uuid !== "undefined") {
                requestUUID = req.query.uuid;
                if (typeof configureRequests[requestUUID] === "undefined")
                    throw new Error("Request UUID is invalid");
                requestData = configureRequests[requestUUID];
            }

            switch (req.method) {
                case 'POST':

                    if (!dnsAdminEmails || dnsAdminEmails.length === 0)
                        throw new Error("Administrator Email could not be found");

                    if (req.body.uuid) {
                        requestUUID = req.body.uuid;
                        if (typeof configureRequests[requestUUID] === "undefined")
                            throw new Error("Request UUID is invalid");
                        requestData = configureRequests[requestUUID];
                        delete configureRequests[requestUUID];

                        // if(!req.body.password)
                        //     throw new Error("Field is required: password");
                        // const adminPassword = req.body.password;
                        if (!req.body.database)
                            throw new Error("Field is required: database");
                        const database = req.body.database;

                        await DatabaseClient.configureDatabase(database, hostname, null);
                        const userTable = new UserTable(req.database, req.server.dbClient);
                        const adminUser = await userTable.createUser(req.body.username || 'admin', requestData.adminEmail, req.body.password, 'admin, email');

                        // await UserAPI.sendResetPasswordRequestEmail(req, adminUser);

                        status = 200;
                        message = `
                        Database ${database} has been successfully configured. <br/>
                        An administrator account has been created under the email <a href="${adminUser.url}">${adminUser.email}</a>. <br/>
                        You may now <a href="/:user/:login?userID=${adminUser.username}">log in</a> and administrate <em>${hostname}</em>. <br/>`;
                        isActive = false;
                        break;
                    }

                    // Initial Post
                    if (!req.body.admin_email)
                        throw new Error("Field is required: admin_email");
                    selectedAdminEmail = req.body.admin_email;
                    if (dnsAdminEmails.indexOf(selectedAdminEmail) === -1)
                        throw new Error("Invalid Admin Email");

                    const uuid = uuidv4();
                    const requestURL = req.protocol + '://' + req.get('host') + `/:task/database-configure/?uuid=${uuid}`;

                    configureRequests[uuid] = {
                        adminEmail: selectedAdminEmail,
                        hostname
                    };

                    setTimeout(function () {
                        delete configureRequests[uuid];
                    }, 1000 * 60 * 60);
                    const email = new ConfigureDatabaseMail(req.server.mailClient, requestURL, `Administrator <${selectedAdminEmail}>`, hostname);
                    await email.send();

                    status = 200;
                    message = `A request to configure the database for ${hostname} has been sent to ${selectedAdminEmail}`;

                    break;
            }
        } catch (e) {
            // isActive = false;
            console.error(e);
            status = 400;
            message = `Database for ${hostname} could not be configured. <br/><code>${e}</code>`;
        }
        return `
            <form action="/:task/${taskName}" method="POST" class="task task-database-configure themed">
                ${requestUUID ? `<input type="hidden" name="uuid" value="${requestUUID||''}">` : ``}
                <table class="task themed">
                <caption>Task '${taskName}'</caption>
                    <thead>
                        <td colspan="2">
                            <div class="${status === 200 ? 'success' : (!status ? 'message' : 'error')} status-${status}">
                                ${message}
                            </div>
                        </td>
                        <tr><td colspan="2"><hr/></td></tr>
                        <tr>
                            <td colspan="2">
                                The database for <strong>${hostname}</strong> has not yet been configured.  
                            ${requestUUID ? `
                                Please use this form to configure the <strong>domain database</strong>.
                            ` : `
                                Please use this form send a database configuration request.
                                A <strong>validation email</strong> will be sent to the <strong>hostmaster</strong> of this server. 
                                <br/>
                                Please have the hostmaster complete the last step according to the email's instructions.
                            ` }
                            </td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><label for="hostname">Host Name:</label></td>
                            <td>
                                <input type="text" name="hostname" id="hostname" value="${hostname||'localhost'}" autocomplete="off" required />
                            </td>
                        </tr>
                        ${requestUUID ? `
                        <tr>
                            <td><label for="hostname">Database Name:</label></td>
                            <td>
                                <input type="text" name="database" value="${defaultDatabaseName}" ${requestUUID ? '' : 'disabled'}/>
                            </td>
                        </tr>
                        ` : `` }
                        <tr>
                            <td><label for="admin_email">Administrator Email:</label></td>
                            <td>
                                ${requestUUID ? `
                                <input type="email" name="admin_email" id="admin_email" value="${requestData.adminEmail}" disabled/>
                                ` : `
                                <select name="admin_email" required>
                                    <option value="">Select an email</option>
                                    ${dnsAdminEmails.map(dnsAdminEmail => 
                                        `<option value="${dnsAdminEmail}">${dnsAdminEmail}</option>`
                                    ).join('')}
                                </select>
                                `}
                            </td>
                        </tr>
                        ${requestUUID ? `
                        <tr>
                            <td><label for="username">Administrator Email:</label></td>
                            <td>
                                <input type="text" name="username" id="username" value="admin" required/>
                            </td>
                        </tr>
                        <tr>
                            <td><label for="password">Administrator Password:</label></td>
                            <td>
                                <input type="password" name="password" id="password" value="" required/>
                            </td>
                        </tr>
                        ` : `` }
                    </tbody>
                    <tfoot>
                        <tr><td colspan="2"><hr/></td></tr>
                        <tr>
                            <td colspan="2" style="text-align: right;">
                                ${requestUUID ? `
                                <button type="submit" class="themed">Create Domain Database</button>
                                ` : `
                                <button type="submit" class="themed">Send Validation Email</button>
                                `}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </form>`;
    }

}

exports.databaseConfigureTask = databaseConfigureTask;