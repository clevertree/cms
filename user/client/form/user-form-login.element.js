document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserLoginFormElement extends HTMLElement {
        constructor() {
            super();
            this.state = {
                message: "In order to start a new session please enter your username or email and password and hit 'Log in' below",
                status: 0,
                processing: false,
                userID: "",
                password: "",
                session_save: ""
            };
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
            const userID = this.state.userID || null;
            // console.log("STATE", this.state);
            this.innerHTML =
                `
                <form action="/:user/:login" method="POST" class="user user-form-login themed">
                    <table class="user themed">
                        <caption>Log In</caption>
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
                                <td><label>Username:</label></td>
                                <td>
                                    <input type="text" name="userID" value="${userID || ''}" required />
                                </td>
                            </tr>
                            <tr>
                                <td><label>Password:</label></td>
                                <td>
                                    <input type="password" name="password" value="${this.state.password || ''}" required />
                                </td>
                            </tr>
                            <tr>
                                <td><label>Stay logged in:</label></td>
                                <td>
                                    <input type="checkbox" name="session_save" ${this.state.session_save ? 'checked="checked"' : ''} value="1"/>
                                    <div style="float: right">
                                        <a href=":user/:forgotpassword${userID ? '?userID=' + userID : ''}">Forgot Password?</a>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td>
                                    <a href=":user/:register${userID ? '?userID=' + userID : ''}">Register</a>
                                </td>
                                <td style="text-align: right;">
                                    <button type="submit" ${this.state.processing ? 'disabled="disabled"' : null}>Log In</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </form>
`;
        }
    }
    customElements.define('user-form-login', HTMLUserLoginFormElement);
}