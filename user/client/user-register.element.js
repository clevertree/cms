document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/user.css");
});

{
    class HTMLUserRegisterFormElement extends HTMLElement {
        constructor() {
            super();
            this.state = {
                message: "To register a new account, please enter your email and password",
                status: 0,
                response: null,
                processing: false,
                duplicateRegistration: false
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
            // const userID = this.getAttribute('userID');
            // if(userID)
            //     this.requestFormData(userID);
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
            if(this.state.duplicateRegistration) {
                this.state.duplicateRegistration = false;
                if(confirm("This user account already exists. Would you like to attempt logging in?")) {
                    const formData = this.getFormData();
                    console.log(formData);
                    document.location.href = ':user/:login?userID=' + (formData.username || formData.email);
                }
            }
        }

        onChange(e) {
            const form = e.target.form || e.target;
            if(!form.username.value && form.email.value) {
                form.username.value = form.email.value.split('@')[0];
            }
            form.username.value = (form.username.value || '').replace(/[^\w.]/g, '');
        }

        onSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const request = this.getFormData(form);
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
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.responseType = 'json';
            xhr.send(JSON.stringify(request));
            this.setState({processing: true});
        }

        getFormData(form=null) {
            form = form || this.querySelector('form');
            const formData = {};
            new FormData(form).forEach((value, key) => formData[key] = value);
            return formData;
        }

        render() {
            const formData = this.getFormData();
            // console.log(formData);
            const hostname = document.location.host.split(':')[0];
            this.innerHTML =
                `
                <form action="/:user/:register" method="POST" class="user user-registerform themed">
                    <fieldset>
                        <legend>Register a new account</legend>
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
                                    <td class="label">Email</td>
                                    <td>
                                        <input type="email" name="email" value="${formData.email||''}" required />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Username</td>
                                    <td style="position: relative;">
                                        <input type="text" name="username" value="${formData.username||''}" required /> 
                                        <div style="position: absolute; right: 30px; top: 7px; color: grey;">@${hostname}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Password</td>
                                    <td>
                                        <input type="password" name="password" value="${formData.password||''}" autocomplete="off" required />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Confirm</td>
                                    <td>
                                        <input type="password" name="password_confirm" value="${formData.password_confirm||''}" autocomplete="off" required/>
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td>
                                        <a href=":user/:login${this.state.userID ? '?userID=' + this.state.userID : ''}">Back to Login</a>
                                    </td>
                                    <td style="text-align: right;">
                                        <button type="submit" ${this.state.processing ? 'disabled="disabled"' : null}>Register</button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('user-registerform', HTMLUserRegisterFormElement);

}