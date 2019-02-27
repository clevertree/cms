// TODO: approve all drafts

const { DNSManager } = require('../../domain/dns.manager');
const { UserDatabase } = require('../user.database');

class AdminConfigureTask {
    constructor(taskName, database) {
        this.database = database;
        this.taskName = taskName;
    }

    async isActive(sessionUser) {
        if(!this.database)
            return false;
        // if(!sessionUser)
        //     return false;
        // if(sessionUser.isAdmin())
        //     return false;

        const userDB = new UserDatabase(this.database);
        let adminUser = await userDB.fetchUser("FIND_IN_SET('admin', u.flags) LIMIT 1");
        if(adminUser) {
            // console.log(`Admin User Found [DB: ${this.database}]: `, adminUser);
            return false;
        }
        // console.warn(`Admin User Not Found in ${this.database}`);
        return true;
    }

    async dnsQueryAdminEmail(req) {
        const hostname = (req.get ? req.get('host') : req.headers.host).split(':')[0];
        console.info("Querying WHOIS for admin email: " + hostname);

        const result = await new Promise(function (resolve, reject) {
            const dns = require('dns');
            dns.resolveSoa(hostname, function (err, records) {
                err ? reject(err) : resolve(records);
            });
        });
        console.info(result);
        if(result.hostmaster) {
            return result.hostmaster
                .replace('\\.', '><')
                .replace(/\./, '@')
                .replace('><', '.');
        }
        return await DNSManager.queryDNSAdmin(hostname);
        // if(dnsAdminEmail)
        //     return dnsAdminEmail;

        // return null;
    }

    async handleFormSubmit(req, sessionUser=null) {
        if(!(await this.isActive(sessionUser)))
            throw new Error("This task is not active");

        let dnsAdminEmail = await this.dnsQueryAdminEmail(req);
        if(!dnsAdminEmail)
            throw new Error("Administrator Email could not be found");

        const userDB = new UserDatabase(this.database);
        // const adminUser = await userDB.createUser('admin', dnsAdminEmail, null, 'admin');
        console.info(`Admin user created from DNS info (${adminUser.id}: ` + dnsAdminEmail);
        // TODO: don't create admin account until user completes validation
        // TODO: send email;
    }

    async renderFormHTML(req, sessionUser=null) {
        const hostname = (req.get ? req.get('host') : req.headers.host).split(':')[0];
        let status = 0;
        let message = `Task '${this.taskName}': Create an Administrator Account`;
        let dnsAdminEmail = await this.dnsQueryAdminEmail(req);
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
                                        Step #1. <a href="https://www.linode.com/docs/platform/manager/dns-manager/#add-a-domain-zone">Change</a> 
                                        your domain's DNS <a href="https://support.rackspace.com/how-to/what-is-an-soa-record/">SOA Email</a> 
                                        field to the administrator's email address who's responsible for managing <strong>${hostname}</strong>. 
                                    </p>
                                    <p>
                                        Step #2. Submit this form to send an email validation request to <strong>${dnsAdminEmail}</strong>.
                                    </p>
                                    <p>
                                        Step #3. Check the email sent to ${dnsAdminEmail} for instructions on creating an admin account for ${hostname}. 
                                    </p>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="label">Admin Email</td>
                                <td>
                                    <input type="email" name="email" value="${dnsAdminEmail || "No Email Found"}" disabled/>
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