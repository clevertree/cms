document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/user.css");
});

{
    class HTMLUserForgotPasswordFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                message: "In order to recover your password, please enter your email and hit submit below",
                status: 0,
                userID: "",
                password: "",
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
            this.setState({processing: false});
        }

        onChange(e) {
            if(typeof this.state[e.target.name] !== 'undefined')
                this.state[e.target.name] = e.target.value;
        }


        onSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const formValues = Array.prototype.filter
                .call(form ? form.elements : [], (input, i) => !!input.name && (input.type !== 'checkbox' || input.checked))
                .map((input, i) => input.name + '=' + encodeURI(input.value))
                .join('&');
            const method = form.getAttribute('method');
            const action = form.getAttribute('action');

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
            xhr.open(method, action, true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.responseType = 'json';
            xhr.send(formValues);
            this.setState({processing: true});
        }

        render() {
            // console.log("STATE", this.state);
            this.innerHTML =
                `
                <form action="/:user/:forgotpassword" method="POST" class="user user-forgotpasswordform themed">
                    <fieldset ${this.state.processing ? 'disabled="disabled"' : null}>
                        <legend>Forgot Password</legend>
                        <table class="user">
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
                                    <td class="label">Email or UserID</td>
                                    <td>
                                        <input type="text" name="userID" value="${this.state.userID||''}" placeholder="Username or Email" required />
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
    customElements.define('user-forgotpasswordform', HTMLUserForgotPasswordFormElement);

}