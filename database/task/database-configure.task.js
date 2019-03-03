const uuidv4 = require('uuid/v4');

const { DatabaseManager } = require("../database.manager");
const { UserAPI } = require("../../user/user.api");
const { UserDatabase } = require("../../user/user.database");
const { ConfigureDatabaseMail } = require('../mail/configuredatabase.mail');
const configureRequests = {
    'fcc5c230-45ff-4382-a9fa-d4078ec6f6b0': {
        adminEmail: 'ari.asulin@gmail.com',
        hostname: 'paradigmthreat.org',
    }
};
class DatabaseConfigureTask {
    constructor(database) {
        // Null domain means domain hasn't been configured yet
        this.database = database;
    }

    static getTaskName() {
        return 'database-configure';
    }


    async isActive(req, sessionUser=null) {
        // if(this.database)
        //     return false;

        let hostname = DatabaseManager.getHostnameFromRequest(req);

        const domainDB = DatabaseManager.getPrimaryDomainDB();
        const domain = await domainDB.fetchDomainByHostname(hostname);
        if(!domain)
            throw new Error("Domain entry missing. Shouldn't happen");
        if(!domain.database)
            return true;

        // TODO: check to see if database exists. If the domain entry is missing, then it's active
        const databaseResult = await DatabaseManager.queryAsync(`SHOW DATABASES LIKE '${domain.database}'`);
        if(databaseResult.length > 0)
            return false;

        // TODO: task also applies to database connection problems
        // console.warn(`Database User Not Found in ${this.database}`);
        return true;
    }



    async renderFormHTML(req, sessionUser=null) {
        const taskName = DatabaseConfigureTask.getTaskName();
        const hostname = (req.get ? req.get('host') : req.headers.host).split(':')[0];
        let status = 0;
        let message = `Configure Database for ${hostname}`;

        const defaultDatabaseName = hostname.replace('.', '_') + '_cms';

        // const isAdmin = sessionUser && sessionUser.isAdmin();

        let requestUUID = null, selectedAdminEmail = null, requestData = {}, dnsAdminEmails = [];
        try {
            if (!(await this.isActive(req, sessionUser)))
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
                        if (typeof configureRequests[req.body.uuid] === "undefined")
                            throw new Error("Request UUID is invalid");
                        requestData = configureRequests[req.body.uuid];

                        // if(!req.body.password)
                        //     throw new Error("Field is required: password");
                        // const adminPassword = req.body.password;
                        if (!req.body.database)
                            throw new Error("Field is required: database");
                        const database = req.body.database;

                        await DatabaseManager.configureDatabase(database, hostname, null);
                        const userDB = new UserDatabase(database);
                        const adminUser = await userDB.createUser('admin', requestData.adminEmail, null, 'admin');

                        await UserAPI.sendResetPasswordRequestEmail(req, adminUser);

                        status = 200;
                        message = `
                        Database ${database} has been successfully configured. <br/>
                        An administrator account has been created under the email ${adminUser.email}. <br/>
                        Please follow the instructions provided in the email to complete the administrator account registration. <br/>
`;
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
                    const email = new ConfigureDatabaseMail(requestURL, `Administrator <${selectedAdminEmail}>`, hostname);
                    await email.send();

                    status = 200;
                    message = `A request to configure the database for ${hostname} has been sent to ${selectedAdminEmail}`;

                    break;
            }
        } catch (e) {
            console.error(e);
            status = 400;
            message = `Database for ${hostname} could not be configured. <br/><code>${e}</code>`;
        }
        return `
            <form action="/:task/${taskName}" method="POST" class="task task-database-configure themed">
                ${requestUUID ? `<input type="hidden" name="uuid" value="${requestUUID||''}">` : ``}
                <fieldset>
                    <legend>Task '${taskName}'</legend>
                    <table class="task">
                        <thead>
                            <td colspan="2">
                                <div class="${status === 200 ? 'success' : (!status ? 'message' : 'error')} status-${status}">
                                    ${message}
                                </div>
                            </td>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td colspan="2">
                                    <p>
                                        The database for <strong>${hostname}</strong> has not yet been configured.  
                                    ${requestUUID ? `
                                        Please use this form to configure the <strong>domain database</strong>.
                                    ` : `
                                        Please use this form send a database configuration request.
                                        A <strong>validation email</strong> will be sent to the <strong>hostmaster</strong> of this server. 
                                    </p>
                                    <p>
                                        Please have the hostmaster complete the last step according to the email's instructions.
                                    ` }
                                    </p>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="label">Hostname</td>
                                <td>
                                    <input type="hostname" name="hostname" value="${hostname || "No Hostname Found"}" disabled/>
                                </td>
                            </tr>
                            ${requestUUID ? `
                            <tr>
                                <td class="label">Database Name</td>
                                <td>
                                    <input type="text" name="database" value="${defaultDatabaseName}" ${requestUUID ? '' : 'disabled'}/>
                                </td>
                            </tr>
                            ` : `` }
                            <tr>
                                <td class="label">Administrator Email</td>
                                <td>
                                    ${requestUUID ? `
                                    <input type="email" name="admin_email" value="${requestData.adminEmail}" disabled/>
                                    ` : `
                                    <select name="admin_email" required>
                                        ${dnsAdminEmails.map(dnsAdminEmail => 
                                            `<option value="${dnsAdminEmail}">${dnsAdminEmail}</option>`
                                        ).join('')}
                                    </select>
                                    `}
                                </td>
                            </tr>
                            ${requestUUID ? `
                            <tr>
                                <td class="label">Administrator Username</td>
                                <td>
                                    <input type="text" name="username" value="admin" required/>
                                </td>
                            </tr>
                            ` : `` }
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td colspan="2" style="text-align: right;">
                                    ${requestUUID ? `
                                    <button type="submit">Create Domain Database</button>
                                    ` : `
                                    <button type="submit">Send Validation Email</button>
                                    `}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </fieldset>
            </form>`;
    }

}

exports.DatabaseConfigureTask = DatabaseConfigureTask;