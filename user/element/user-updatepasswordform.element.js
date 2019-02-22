document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("user/element/user.css");
});

{
    class HTMLUserUpdatePasswordFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                message: "In order to change password, please modify this form and hit 'Update' below",
                status: 0,
                user: {id: -1},
                password_old: null,
                password_new: null,
                password_confirm: null,
            };
            // this.state = {id:-1, changepasswords:[]};
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
            const userID = this.getAttribute('userID');
            if(userID)
                this.requestFormData(userID);
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
            let value = e.target.value;
            if(e.target.getAttribute('type') === 'checkbox')
                value = e.target.checked;
            if(e.target.name && typeof this.state[e.target.name] !== 'undefined')
                this.state[e.target.name] = value;
            // console.log(this.state);
        }

        requestFormData(userID) {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                this.setState({processing: false, editable: false}, xhr.response);
                if(this.state.sessionUser && this.state.user) {
                    if(this.state.sessionUser.flags.indexOf('admin') !== -1)
                        this.setState({editable: 'admin'});
                    else if (this.state.sessionUser.id === this.state.user.id)
                        this.setState({editable: 'user'});
                }
            };
            xhr.responseType = 'json';
            xhr.open ("GET", `:user/${userID}/:json?getAll=true`, true);
            xhr.send ();
            this.setState({processing: true});
        }

        onSubmit(e) {
            e.preventDefault();
            const form = e.target; // querySelector('form.user-login-form');
            this.setState({processing: true});
            const request = {};
            new FormData(form).forEach(function (value, key) {
                request[key] = value;
            });

            const xhr = new XMLHttpRequest();
            xhr.onload = (e) => {
                console.log(e, xhr.response);
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                response.status = xhr.status;
                if(xhr.status === 200) {
                    this.onSuccess(e, response);
                } else {
                    this.onError(e, response);
                }
                this.setState({response, processing: false});
            };
            xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.responseType = 'json';
            xhr.send(JSON.stringify(request));
        }

        render() {
            this.innerHTML =
                `
                <form action="/:user/${this.state.user.id}/:password" method="POST" class="user user-changepasswordform themed">
                    <fieldset ${this.state.processing || this.state.editable === false ? 'disabled="disabled"' : null}>
                        <legend>Change Password</legend>
                        <table>
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
                            <tbody class="themed">
                                <tr>
                                    <td class="label">Email</td>
                                    <td>
                                        <input type="email" name="email" value="${this.state.user.email}" disabled/>
                                    </td>
                                </tr>
                                ${this.state.editable !== 'admin' ? `
                                <tr>
                                    <td class="label">Old Password</td>
                                    <td>
                                        <input type="password" name="password_old" value="${this.state.password_old||''}" required />
                                    </td>
                                </tr>
                                ` : ''}
                                <tr>
                                    <td class="label">New Password</td>
                                    <td>
                                        <input type="password" name="password_new" value="${this.state.password_new||''}" required />
                                    </td>
                                </tr>
                                ${this.state.editable !== 'admin' ? `
                                <tr>
                                    <td class="label">Confirm Password</td>
                                    <td>
                                        <input type="password" name="password_confirm" value="${this.state.password_confirm||''}" required />
                                    </td>
                                </tr>
                                ` : ''}
                            </tbody>
                            <tfoot>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td>
                                    </td>
                                    <td style="text-align: right;">
                                        <button type="submit">Update Password</button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('user-updatepasswordform', HTMLUserUpdatePasswordFormElement);

}