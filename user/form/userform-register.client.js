document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("user/form//userform.css");
});

{
    class HTMLUserRegisterFormElement extends HTMLElement {
        constructor() {
            super();
            this.state = {
                response: null,
                processing: false
            }
            // this.state = {
            //     username: "",
            //     email: "",
            //     password: "",
            // };
            // this.state = {id:-1, flags:[]};
        }

        setState(newState) {
            Object.assign(this.state, newState);
            this.render();
        }

        connectedCallback() {
            this.addEventListener('change', this.onEvent);
            this.addEventListener('submit', this.onEvent);

            this.render();
            const userID = this.getAttribute('user-id');
            if(userID)
                this.requestFormData(userID);
        }

        onSuccess(e, response) {
            setTimeout(() => window.location.href = response.redirect, 3000);
        }
        onError(e, response) {}

        onEvent(e) {
            const form = e.target.form || e.target;
            switch (event.type) {
                case 'submit':
                    this.submit(e);
                    break;

                case 'change':
                    // if(typeof this.state[e.target.name] !== "undefined")
                    //     this.state[e.target.name] = e.target.value;
                    if(!form.username.value && form.email.value) {
                        form.username.value = form.email.value.split('@')[0];
                    }
                    // console.log(this.state);
                break;
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

        getFormData() {
            const form = this.querySelector('form');
            const formData = {};
            if(form) {
                new FormData(form).forEach(function (value, key) {
                    formData[key] = value;
                });
            }
            return formData;
        }

        render() {
            const formData = this.getFormData();
            // console.log(formData);
            const hostname = document.location.host.split(':')[0];
            this.innerHTML =
                `
                <form action="/:user/register" method="POST" class="userform userform-register themed">
                    <fieldset>
                        <legend>Register a new account</legend>
                        <table>
                            <thead>
                                <tr>
                                    <td colspan="2">
                                        ${this.state.response ? `<div class="${this.state.response.status === 200 ? 'success' : 'error'}">
                                            ${this.state.response.message}
                                        </div>` : "To register a new account, <br/>please enter your email and password"}
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
                                    <td>
                                        <input type="username" name="username" value="${formData.username||''}" required /> @${hostname}
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
                                    <td class="label"></td>
                                    <td>
                                        <button type="submit">Register</button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('userform-register', HTMLUserRegisterFormElement);

}