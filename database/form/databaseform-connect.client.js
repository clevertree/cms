document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("database/form/databaseform.css");
});

{
    class HTMLDatabaseConnectFormElement extends HTMLElement {
        constructor() {
            super();
            this.state = {
                title: "Connect Website to Database",
                message: "In order to connect this Website to a Database, please enter the database credentials below and hit 'Connect'",
                method: 'POST',
                action: '/:database/:connect/',
                classes: 'databaseform databaseform-connect themed',
                status: 0,
                processing: false
            }
        }

        setState(newState) {
            for(let i=0; i<arguments.length; i++)
                Object.assign(this.state, arguments[i]);
            this.render();
        }

        connectedCallback() {
            this.addEventListener('change', e => this.onChange(e));
            this.addEventListener('submit', e => this.onSubmit(e));

            this.render();
        }

        onSuccess(e, response) {
            console.log(response);
            if(response.redirect) {
                this.setState({processing: true});
                setTimeout(() => window.location.href = response.redirect, 3000);
            }
        }

        onError(e, response) {
            console.error(e, response);
        }

        onChange(e) {
            // const form = e.target.form || e.target;
            // if(!form.username.value && form.email.value) {
            //     form.username.value = form.email.value.split('@')[0];
            // }
            // form.username.value = (form.username.value || '').replace(/[^\w.]/g, '');
        }

        onSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const request = this.getFormData(form);

            const xhr = new XMLHttpRequest();
            xhr.onload = (e) => {
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                this.setState({processing: false, status: xhr.status}, response);
                if(xhr.status === 200) {
                    this.onSuccess(e, response);
                } else {
                    this.onError(e, response);
                }
            };
            xhr.open(this.state.method, this.state.action, true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.responseType = 'json';
            xhr.send(JSON.stringify(request));
            this.setState({processing: true});
        }

        getFormData(form) {
            const formData = {};
            new FormData(form).forEach((value, key) => formData[key] = value);
            return formData;
        }

        render() {
            const formData = this.getFormData();
            // console.log(formData);
            const hostname = document.location.host.split(':')[0];
            const defaultDatabaseName = hostname.replace('.', '_') + '_cms';
            this.innerHTML =
                `
                <form action="${this.state.action}" method="${this.state.method}" class="${this.state.classes}">
                    <fieldset ${this.state.processing ? 'disabled="disabled"' : null}>
                        <legend>${this.state.title}</legend>
                        <table style="width: 100%">
                            <thead>
                                <tr>
                                    <td colspan="2">
                                        <div class="${this.state.status === 200 ? 'success' : (!this.state.status ? 'message' : 'error')} status-${this.state.status}">
                                            ${this.state.message}
                                        </div>
                                    </td>
                                </tr>
                                <tr><td colspan="2"><hr/></td></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="label">Host</td>
                                    <td>
                                        <input type="text" name="host" value="${formData.host||'localhost'}" autocomplete="off" required />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Username</td>
                                    <td>
                                        <input type="text" name="user" value="${formData.user||'cms_user'}" autocomplete="off" required /> 
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Password</td>
                                    <td>
                                        <input type="password" name="password" value="${formData.password||'cms_pass'}" autocomplete="off" required />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Database Name</td>
                                    <td>
                                        <input type="database" name="database" value="${formData.database||defaultDatabaseName}" autocomplete="off" />
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td>
                                        <a href=":database">Database Status</a>
                                    </td>
                                    <td style="text-align: right;">
                                        <button type="submit">Connect</button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </fieldset>
                    <br/>
                    <fieldset>
                        <legend>MYSQL Instructions</legend>
                        <div class="message">
                            In order to create a new mysql user, please use the following commands
                        </div>
                        <code style="white-space: pre;">
$ sudo mysql;
CREATE USER 'cms_user'@'localhost' IDENTIFIED BY 'cms_pass';
GRANT ALL ON *.* TO 'cms_user'@'localhost';
FLUSH PRIVILEGES;
                        </code>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('databaseform-connect', HTMLDatabaseConnectFormElement);

}