document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("server/user/element/userform.css");
});

{
    class HTMLUserForgotPasswordFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
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

        onSuccess(e, response) {
            setTimeout(() => window.location.href = response.redirect, 3000);
        }
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
            xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.responseType = 'json';
            xhr.send(JSON.stringify(request));
        }

        render() {
            this.innerHTML =
                `
                <form action="/:user/forgotpassword" method="POST" class="userform userform-forgotpassword themed" style1="display: none;">
                    ${this.state.error ? `<div class="error">${this.state.error}</div>` : null}
                    <fieldset>
                        <legend>Forgot Password</legend>
                        <table>
                            <caption>
                                In order to recover your password, <br/>please enter your email and hit submit below
                                ${this.state.error ? `<div class="error">${this.state.error}</div>` : ''}
                                </caption>
                            <tbody>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td class="label">Email</td>
                                    <td>
                                        <input type="email" name="email" value="${this.state.email}" required />
                                    </td>
                                </tr>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td class="label"></td>
                                    <td>
                                        <button type="submit">Submit</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('userform-forgotpassword', HTMLUserForgotPasswordFormElement);

}