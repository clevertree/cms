// TODO: approve all drafts

const { UserDatabase } = require('../user.database');

class AdminConfigureTask {
    constructor(taskName, database) {
        this.database = database;
        this.taskName = taskName;
        this.dbMissingAdmin = {};
    }

    async isActive(sessionUser) {
        return !!sessionUser;

        if(typeof this.dbMissingAdmin[database] !== 'undefined') {
            return this.dbMissingAdmin[database];
        }

        if(sessionUser.isAdmin()) {
            this.dbMissingAdmin[database] = false;
            return false;
        }

        const userDB = new UserDatabase(database);
        let adminUser = await userDB.fetchUser("FIND_IN_SET('admin', u.flags) LIMIT 1");
        if(adminUser) {
            console.log(`Admin User Found [DB: ${database}]: `, adminUser);
            this.dbMissingAdmin[database] = false;

        } else {
            console.warn(`Admin User Not Found in ${database}`);
            this.dbMissingAdmin[database] = true;
        }
        return this.dbMissingAdmin[database];
    }

    async handleFormSubmit(req, sessionUser) {

        const hostname = req.get ? req.get('host') : req.headers.host;
        console.info("Querying WHOIS for admin email: " + hostname);
        let dnsAdminEmail = await DNSManager.queryDNSAdmin(hostname);
        if (dnsAdminEmail) {
            // dnsAdminEmail.split('@')[0]
            adminUser = await this.createUser('admin', dnsAdminEmail, null, 'admin');
            console.info(`Admin user created from DNS info (${adminUser.id}: ` + dnsAdminEmail);
            // TODO: send email;
        }
    }

    async renderFormHTML(req, sessionUser) {
        let status = 0;
        let message = `Task '${this.taskName}': Validate an Administrator Email`;
        return `
            <form action="/:task/${this.taskName}" method="POST" class="task task-admin-configure themed">
                <input type="hidden" name="taskName" value="${this.taskName}" />
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
                                        Step #1. Make sure your administrator's email address appears to the right of the word 'Admin' 
                                        on your <a href="https://dnslytics.com/domain/${req.get('host').split(':')[0]}">domain's WHOIS page</a>.
                                    </p>
                                    <p>
                                        Step #2. Enter your administrator's email address and hit 'Validate' in the form below.
                                        The system will attempt to associated your administrator's email with the domain WHOIS info.
                                    </p>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="label">Email</td>
                                <td>
                                    <input type="email" name="email" value="${sessionUser ? sessionUser.email : ''}"/>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td colspan="2" style="text-align: right;">
                                    <button type="submit">Validate</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </fieldset>
            </form>`;
    }
}

exports.AdminConfigureTask = AdminConfigureTask;