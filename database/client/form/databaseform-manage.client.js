document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("database/form/databaseform.css");
});

{
    class HTMLDatabaseManageFormElement extends HTMLElement {
        constructor() {
            super();
            this.state = {
                title: "Manage Website Database",
                message: "In order to manage this Website to a Database, please enter the database credentials below and hit 'Manage'",
                method: 'POST',
                action: '/:database/:manage/',
                classes: 'databaseform database-manage themed',
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
            this.requestFormData();
        }

        onSuccess(response) {
            console.log(response);
            if(response.redirect) {
                this.setState({processing: true});
                setTimeout(() => window.location.href = response.redirect, 2000);
            }
        }

        onError(response) {
            console.error(response.message || 'Error: ', response);
        }

        onChange(e) {
            // const form = e.target.form || e.target;
            // if(!form.username.value && form.email.value) {
            //     form.username.value = form.email.value.split('@')[0];
            // }
            // form.username.value = (form.username.value || '').replace(/[^\w.]/g, '');
        }

        requestFormData(userID) {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                this.setState({processing: false}, xhr.response);
                this.setState({editable: this.state.sessionUser && this.state.user &&
                        (this.state.sessionUser.flags.indexOf('admin') !== -1 || this.state.sessionUser.id === this.state.user.id)});
            };
            xhr.responseType = 'json';
            xhr.open ("GET", `:database/:json?getAll=true`, true);
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.send ();
            this.setState({processing: true, userID: userID});
        }


        onSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const formValues = Array.prototype.filter
                .call(form ? form.elements : [], (input, i) => !!input.name && (input.type !== 'checkbox' || input.checked))
                .map((input, i) => input.name + '=' + encodeURIComponent(input.value))
                .join('&');
            const method = form.getAttribute('method');
            const action = form.getAttribute('action');

            const xhr = new XMLHttpRequest();
            xhr.onload = (e) => {
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                this.setState({processing: false, status: xhr.status}, response);
                if(xhr.status === 200) {
                    this.onSuccess(response);
                } else {
                    this.onError(response);
                }
            };
            xhr.open(method, action, true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.responseType = 'json';
            xhr.send(formValues);
            this.setState({processing: true});
        }

        render() {
            const formData = this.getFormData();
            // console.log(formData);
            const hostname = document.location.host.split(':')[0];
            const defaultDatabaseName = hostname.replace('.', '_') + '_cms';
            this.innerHTML =
                `
                <form action="${this.state.action}" method="${this.state.method}" class="${this.state.classes}">
                    <table style="width: 100%">
                        <caption>${this.state.title}</caption>
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
                                <td><label for="hostname">Hostname:</label></td>
                                <td>
                                    <input type="text" name="hostname" id="hostname" value="${formData.hostname||'localhost'}" autocomplete="off" required />
                                </td>
                            </tr>
                            <tr>
                                <td><label for="user">Username:</label></td>
                                <td>
                                    <input type="text" name="user" id="user" value="${formData.user||'cms_user'}" autocomplete="off" required /> 
                                </td>
                            </tr>
                            <tr>
                                <td><label for="password">Password:</label></td>
                                <td>
                                    <input type="password" name="password" id="password" value="${formData.password||'cms_pass'}" autocomplete="off" required />
                                </td>
                            </tr>
                            <tr>
                                <td><label for="database">Database Name:</label></td>
                                <td>
                                    <input type="database" name="database" id="database" value="${formData.database||defaultDatabaseName}" autocomplete="off" />
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
                                    <button type="submit" class="themed">Manage</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </form>
`;
        }
    }
    customElements.define('database-manage', HTMLDatabaseManageFormElement);
}