// TODO: approve all drafts


class DatabaseConfigureTask {
    constructor(database) {
        this.database = database;
    }

    static getTaskName() {
        return 'database-configure';
    }

    async isActive(sessionUser=null) {
        if(this.database)
            return false;
        // TODO: check if database is missing in domain entry.
        // TODO: task also applies to database connection problems
        // console.warn(`Database User Not Found in ${this.database}`);
        return true;
    }

    async handleFormSubmit(req, sessionUser=null) {
        if(!(await this.isActive(sessionUser)))
            throw new Error("This task is not active");


    }

    async renderFormHTML(req, sessionUser=null) {
        const taskName = DatabaseConfigureTask.getTaskName();
        const hostname = (req.get ? req.get('host') : req.headers.host).split(':')[0];
        let status = 0;
        let message = `Task '${taskName}': Configure Database for ${hostname}`;

        const defaultDatabaseName = hostname.replace('.', '_') + '_cms';

        const isAdmin = sessionUser && sessionUser.isAdmin();
        const hostmaster_email = 'hostmaster@email';
        // TODO: select from admins, notify by default method.

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
                                        ${isAdmin ? `` : `A validation email will be sent to the hostmaster of this server. Please have the hostmaster complete the last step according to the email's instructions`}
                                    </p>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="label">Database Name</td>
                                <td>
                                    <input type="text" name="database" value="${defaultDatabaseName}" ${isAdmin ? `` : `disabled`}/>
                                </td>
                            </tr>
                            <tr>
                                <td class="label">Hostname</td>
                                <td>
                                    <input type="hostname" name="hostname" value="${hostname || "No Hostname Found"}" disabled/>
                                </td>
                            </tr>
                            ${isAdmin ? `` : `<tr>
                                <td class="label">Hostmaster Email</td>
                                <td>
                                    <input type="email" name="hostmaster_email" value="${hostmaster_email}" disabled/>
                                </td>
                            </tr>`}
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td colspan="2" style="text-align: right;">
                                    ${isAdmin 
                                        ? `<button type="submit">Create Database</button>` 
                                        : `<button type="submit">Send Validation Email</button>`}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </fieldset>
            </form>`;
    }

}

exports.DatabaseConfigureTask = DatabaseConfigureTask;