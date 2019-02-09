document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("user/form//userform.css");
});

{
    class HTMLUserResetPasswordFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                userID: "",
                uuid: "",
                password: "",
                message: "Please enter a new password and hit submit below",
                status: 0
            };
            // this.state = {id:-1, flags:[]};
        }

        setState(newState) {
            Object.assign(this.state, newState);
            this.render();
        }

        connectedCallback() {
            // this.addEventListener('change', this.onEvent);
            this.addEventListener('submit', this.onEvent);

            this.state.userID = this.getAttribute('userID');
            if(!this.state.userID)
                this.setState({message: "userID is required", status: 400})
            this.state.uuid = this.getAttribute('uuid');
            if(!this.state.uuid)
                this.setState({message: "UUID is required", status: 400})

            this.render();
        }

        onSuccess(e, response) {
            setTimeout(() => window.location.href = response.redirect, 3000);
        }
        onError(e, response) {}

        onEvent(e) {
            switch (e.type) {
                case 'submit':
                    this.submit(e);
                    break;

                // case 'change':
                //     if(e.target.name && typeof this.state[e.target.name] !== 'undefined')
                //         this.state[e.target.name] = e.target.value;
                //     break;
            }
        }

        submit(e) {
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
                this.setState(Object.assign({processing: false, status: xhr.status}, response));
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
            const messageClass = this.state.status === 200 ? 'success' : (this.state.status === 0 ? '' : 'error');
            this.innerHTML =
                `
                <form action="/:user/${this.state.userID}/:resetpassword/${this.state.uuid}" method="POST" class="userform userform-resetpassword themed">
                    <fieldset>
                        <legend>Reset Password</legend>
                        <table>
                            <thead>
                                <tr>
                                    <td colspan="2">
                                        <div class="${messageClass} status-${this.status}">
                                            ${this.state.message}
                                        </div>
                                    </td>
                                </tr>
                                <tr><td colspan="2"><hr/></td></tr>
                            </thead>
                            <tbody class="themed">
                                <tr>
                                    <td class="label">User ID</td>
                                    <td>
                                        ${this.state.userID}
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
                                    <td class="label"></td>
                                    <td>
                                        <button type="submit">Submit</button>
                                        <div style="float: right">
                                            <a href=":user/:login">Go Back</a>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('userform-resetpassword', HTMLUserResetPasswordFormElement);

}