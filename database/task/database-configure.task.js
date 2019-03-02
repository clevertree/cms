const { DatabaseManager } = require("../database.manager");
const { UserAPI } = require("../../user/user.api");

class DatabaseConfigureTask {
    constructor(database) {
        // Null domain means domain hasn't been configured yet
        this.database = database;
    }

    static getTaskName() {
        return 'database-configure';
    }

    async isActive(req, sessionUser=null) {
        if(this.database)
            return false;

        let hostname = DatabaseManager.getHostnameFromRequest(req);

        const domainDB = DatabaseManager.getPrimaryDomainDB();
        const domain = await domainDB.fetchDomainByHostname(hostname);
        if(!domain)
            throw new Error("Domain entry missing. Shouldn't happen");
        if(domain && domain.database)
            throw new Error("Domain database entry wasn't missing. Shouldn't happen");

        // TODO: check to see if database exists
        const databaseResult = await DatabaseManager.queryAsync(`SHOW DATABASES LIKE \`${this.database}\``);

        // TODO: task also applies to database connection problems
        // console.warn(`Database User Not Found in ${this.database}`);
        return true;
    }



    async renderFormHTML(req, sessionUser=null) {
        const taskName = DatabaseConfigureTask.getTaskName();
        const hostname = (req.get ? req.get('host') : req.headers.host).split(':')[0];
        let status = 0;
        let message = `Task '${taskName}': Configure Database for ${hostname}`;

        const defaultDatabaseName = hostname.replace('.', '_') + '_cms';

        // const isAdmin = sessionUser && sessionUser.isAdmin();

        let dnsAdminEmails = await UserAPI.queryAdminEmailAddresses(null, hostname);

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


                break;
        }

        return `
            <form action="/:task/${taskName}" method="POST" class="task task-database-configure themed">
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
                                        The database for ${hostname} has not yet been configured.  
                                        Please use this form to configure the domain database.
                                        A validation email will be sent to the hostmaster of this server. Please have the hostmaster complete the last step according to the email's instructions.
                                    </p>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="label">Database Name</td>
                                <td>
                                    <input type="text" name="database" value="${defaultDatabaseName}" disabled/>
                                </td>
                            </tr>
                            <tr>
                                <td class="label">Hostname</td>
                                <td>
                                    <input type="hostname" name="hostname" value="${hostname || "No Hostname Found"}" disabled/>
                                </td>
                            </tr>
                            <tr>
                                <td class="label">Hostmaster Email</td>
                                <td>
                                    <select name="admin_email" required>
                                        ${dnsAdminEmails.map(dnsAdminEmail => 
                                            `<option value="${dnsAdminEmail}">${dnsAdminEmail}</option>`
                                        ).join('')}
                                    </select>
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

exports.DatabaseConfigureTask = DatabaseConfigureTask;