const uuidv4 = require('uuid/v4');

// const { DatabaseManager } = require("../../database/database.manager");
const { UserAPI } = require("../../user/user.api");
const { UserTable } = require("../user.table");
const { CreateAdminMail } = require('../mail/createadmin.mail');
const adminRequests = {
    '3a001463-7fa3-4399-bb18-f31f4d510dd0': {
        adminEmail: 'ari.asulin@gmail.com',
        hostname: 'paradigmthreat.org',
    }
};


class AdminConfigureTask {
    constructor(database) {
        this.database = database;
    }

    static getTaskName() {
        return 'admin-configure';
    }

    async isActive(req, sessionUser=null) {
        if(!this.database)
            return false;

        const userDB = new UserTable(this.database);
        let adminUser = await userDB.fetchUser("FIND_IN_SET('admin', u.flags) LIMIT 1");
        if(adminUser) {
            // console.log(`Admin User Found [DB: ${this.database}]: `, adminUser);
            return false;
        }
        // console.warn(`Admin User Not Found in ${this.database}`);
        return true;
    }

    async renderFormHTML(req, sessionUser=null) {
        const taskName = AdminConfigureTask.getTaskName();
        const hostname = (req.get ? req.get('host') : req.headers.host).split(':')[0];
        let status = 0;
        let message = `Create an Administrator Account`;
        let isActive = await this.isActive(req, sessionUser);

        // const isAdmin = sessionUser && sessionUser.isAdmin();

        let requestUUID = null, selectedAdminEmail = null, requestData = {}, dnsAdminEmails = [];
        try {
            if (!isActive)
                throw new Error("This task is not active");

            dnsAdminEmails = await UserAPI.queryAdminEmailAddresses(null, hostname);

            if (typeof req.query.uuid !== "undefined") {
                requestUUID = req.query.uuid;
                if (typeof adminRequests[requestUUID] === "undefined")
                    throw new Error("Request UUID is invalid");
                requestData = adminRequests[requestUUID];
            }

            switch (req.method) {
                case 'POST':

                    if (!dnsAdminEmails || dnsAdminEmails.length === 0)
                        throw new Error("Administrator Email could not be found");

                    if (req.body.uuid) {
                        requestUUID = req.body.uuid;
                        if (typeof adminRequests[requestUUID] === "undefined")
                            throw new Error("Request UUID is invalid");
                        requestData = adminRequests[requestUUID];
                        delete adminRequests[requestUUID];

                        const userDB = new UserTable(this.database);
                        const adminUser = await userDB.createUser(req.body.username || 'admin', requestData.adminEmail, req.body.password, 'admin');

                        // await UserAPI.sendResetPasswordRequestEmail(req, adminUser);

                        status = 200;
                        message = `
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
                    const requestURL = req.protocol + '://' + req.get('host') + `/:task/admin-configure/?uuid=${uuid}`;

                    adminRequests[uuid] = {
                        adminEmail: selectedAdminEmail,
                        hostname
                    };

                    setTimeout(function () {
                        delete adminRequests[uuid];
                    }, 1000 * 60 * 60);
                    const email = new CreateAdminMail(requestURL, `Administrator <${selectedAdminEmail}>`, hostname);
                    await email.send();

                    status = 200;
                    message = `A request to create an admin account for ${hostname} has been sent to ${selectedAdminEmail}`;

                    break;
            }
        } catch (e) {
            isActive = false;
            console.error(e);
            status = 400;
            message = `Administrator for ${hostname} could not be configured. <br/><code>${e}</code>`;
        }
        return `
            <form action="/:task/${taskName}" method="POST" class="task task-database-configure themed">
                ${requestUUID ? `<input type="hidden" name="uuid" value="${requestUUID||''}">` : ``}
                <fieldset ${!isActive ? `disabled` : ``}>
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
                                        <strong>${hostname}</strong> does not have an administrator account.  
                                    ${requestUUID ? `
                                        Please use this form to configure the <strong>administrator</strong>.
                                    ` : `
                                        Please use this form send an account creation request.
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
                            <tr>
                                <td class="label">Administrator Password</td>
                                <td>
                                    <input type="password" name="password" value="" required/>
                                </td>
                            </tr>
                            ` : `` }
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td colspan="2" style="text-align: right;">
                                    ${requestUUID ? `
                                    <button type="submit">Create Administrator</button>
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

exports.AdminConfigureTask = AdminConfigureTask;