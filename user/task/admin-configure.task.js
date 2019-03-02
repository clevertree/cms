// TODO: approve all drafts

// const { DNSManager } = require('../../domain/dns.manager');
const { UserDatabase } = require('../user.database');
const { UserAPI } = require('../user.api');

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

        const userDB = new UserDatabase(this.database);
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
        let message = `Task '${taskName}': Create an Administrator Account`;

        let dnsAdminEmails = await UserAPI.queryAdminEmailAddresses(this.database, hostname);
        // const isAdmin = sessionUser && sessionUser.isAdmin();

        switch(req.method) {
            case 'POST':

                if(!(await this.isActive(req, sessionUser)))
                    throw new Error("This task is not active");

                if(!dnsAdminEmails || dnsAdminEmails.length === 0)
                    throw new Error("Administrator Email could not be found");
                if(!req.body.admin_email)
                    throw new Error("Field is required: admin_email");
                const selectedAdminEmail = req.body.admin_email;
                if(dnsAdminEmails.indexOf(selectedAdminEmail) === -1)
                    throw new Error("Invalid Admin Email");

                const userDB = new UserDatabase(this.database);
                // const adminUser = await userDB.createUser('admin', dnsAdminEmail, null, 'admin');
                console.info(`Admin user created from DNS info (${adminUser.id}: ` + dnsAdminEmail);
                // TODO: don't create admin account until user completes validation
                // TODO: send email;

                break;
        }

        // let dnsAdminEmail = await DNSManager.queryHostAdminEmailAddresses(hostname);
        return `
            <form action="/:task/${taskName}" method="POST" class="task task-admin-configure themed">
                <fieldset>
                    <table>
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
                                        Step #1. <a href="https://www.linode.com/docs/platform/manager/dns-manager/#add-a-domain-zone">Change</a> 
                                        your domain's DNS <a href="https://support.rackspace.com/how-to/what-is-an-soa-record/">SOA Email</a> 
                                        field to the administrator's email address who's responsible for managing <strong>${hostname}</strong>. 
                                    </p>
                                    <p>
                                        Step #2. Select an admin email address and submit this form to send a request to create the admin account.
                                    </p>
                                    <p>
                                        Step #3. Check the email sent to the selected email address for instructions on creating an administrator account for ${hostname}. 
                                    </p>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="label">Admin Email</td>
                                <td>
                                    <select name="admin_email" required>
                                        ${dnsAdminEmails.map(dnsAdminEmail => 
                                            `<option value="${dnsAdminEmail}">${dnsAdminEmail}</option>`
                                        ).join('')}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td class="label">Hostname</td>
                                <td>
                                    <input type="hostname" name="hostname" value="${hostname || "No Hostname Found"}" disabled/>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td colspan="2" style="text-align: right;">
                                    <button type="submit">Send Validation Email</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </fieldset>
            </form>`;
    }

}

exports.AdminConfigureTask = AdminConfigureTask;