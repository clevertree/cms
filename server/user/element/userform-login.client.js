document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("server/user/element/userform.css");
});

{
    class HTMLUserLoginFormElement extends HTMLElement {
        constructor() {
            super();
            this.state = {
                processing: false,
                response: null,
                email: "",
                password: "",
            };
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

        onSuccess(e, response) {}
        onError(e, response) {}

        onEvent(e) {
            switch (event.type) {
                case 'submit':
                    this.submit(e);
                    break;

                case 'change':
                    break;
            }
        }

        submit(e) {
            e.preventDefault();
            const form = e.target; // querySelector('element.user-login-element');
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
            xhr.open(form.method, form.action, true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.responseType = 'json';
            xhr.send(JSON.stringify(request));
        }


        onSuccess(e, response) {
            setTimeout(() => window.location.href = response.redirect, 3000);
        }

        render() {
            console.log("Render", this.state);
            this.innerHTML =
                `
                <form action="/:user/login" method="POST" class="userform userform-login themed">
                    <fieldset ${this.state.processing ? 'disabled="disabled"' : null}>
                        <legend>Log In</legend>
                        <table class="themed">
                            <caption>
                                ${this.state.response ? `<div class="${this.state.response.status === 200 ? 'success' : 'error'}">
                                    ${this.state.response.message}
                                </div>` : "In order to start a new session, <br/>please enter your email and password and hit 'Log in' below"}
                            </caption>
                            <tbody>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td class="label">Email</td>
                                    <td>
                                        <input type="email" name="email" value="${this.state.email}" required />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Password</td>
                                    <td>
                                        <input type="password" name="password" value="${this.state.password}" required />
                                    </td>
                                </tr>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td class="label"></td>
                                    <td>
                                        <button type="submit">Log in</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('userform-login', HTMLUserLoginFormElement);
}