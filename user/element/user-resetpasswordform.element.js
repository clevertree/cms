document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("user/element/user.css");
});

{
    class HTMLUserResetPasswordFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                userID: "",
                password: "",
                message: "Please enter a new password and hit submit below",
                status: 0
            };
            // this.state = {id:-1, flags:[]};
        }

        setState(newState) {
            for(let i=0; i<arguments.length; i++)
                Object.assign(this.state, arguments[i]);
            this.render();
        }

        connectedCallback() {
            this.addEventListener('change', e => this.onChange(e));
            this.addEventListener('submit', e => this.onSubmit(e));

            this.state.userID = this.getAttribute('userID');
            if(!this.state.userID)
                this.setState({message: "Error: userID is required", status: 400});
            this.state.uuid = this.getAttribute('uuid');
            if(!this.state.uuid)
                this.setState({message: "Error: UUID is required", status: 400});
            this.state.username = this.getAttribute('username');

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
                this.setState({processing: false, status: xhr.status}, response);
                if(xhr.status === 200) {
                    this.onSuccess(e, response);
                } else {
                    this.onError(e, response);
                }
            };
            xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.responseType = 'json';
            xhr.send(JSON.stringify(request));
        }

        render() {
            this.innerHTML =
                `
                <form action="/:user/${this.state.userID}/:resetpassword/${this.state.uuid}" method="POST" class="user user-resetpasswordform themed">
                    <fieldset>
                        <legend>Reset Password</legend>
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
                                    <td class="label">Username</td>
                                    <td>
                                        <input type="text" name="username" value="${this.state.username}" disabled />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">New Password</td>
                                    <td>
                                        <input type="password" name="password_new" autocomplete="off" required />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Confirm Password</td>
                                    <td>
                                        <input type="password" name="password_confirm" autocomplete="off" required />
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td>
                                        <button onclick="location.href=':user/:login'" type="button">Go Back</button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button type="submit">Submit</button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('user-resetpasswordform', HTMLUserResetPasswordFormElement);

}