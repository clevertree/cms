document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("app/user/element/userform.css");
});

{
    class HTMLUserChangePasswordFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                user: {id: -1},
                password_old: null,
                password_new: null,
                password_confirm: null,
            };
            // this.state = {id:-1, changepasswords:[]};
        }

        setState(newState) {
            Object.assign(this.state, newState);
            this.render();
        }

        connectedCallback() {
            this.addEventListener('change', this.onEvent);
            this.addEventListener('submit', this.onEvent);

            this.render();
            const userID = this.getAttribute('id');
            if(userID)
                this.requestFormData(userID);
        }

        onSuccess(e, response) {
            // setTimeout(() => window.location.href = response.redirect, 3000);
            this.setState({
                password_old: null,
                password_new: null,
                password_confirm: null,
            })
        }
        onError(e, response) {}

        onEvent(e) {
            switch (e.type) {
                case 'submit':
                    this.submit(e);
                    break;

                case 'change':
                    let value = e.target.value;
                    if(e.target.getAttribute('type') === 'checkbox')
                        value = e.target.checked;
                    if(e.target.name && typeof this.state[e.target.name] !== 'undefined')
                        this.state[e.target.name] = value;
                    // console.log(this.state);
                    break;
            }
        }

        requestFormData(userID) {
            const xhr = new XMLHttpRequest();
            xhr.onload = (e) => {
                // console.info(xhr.response);
                if(xhr.status === 200) {
                    if(!xhr.response || !xhr.response.user)
                        throw new Error("Invalid Response");
                    this.setState(xhr.response);
                } else {
                    const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                    this.onError(e, response);
                }
            };
            xhr.responseType = 'json';
            xhr.open ("GET", `:user/${userID}/json`, true);
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.send ();
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
                <form action="/:user/${this.state.user.id}/changepassword" method="POST" class="userform userform-changepassword themed">
                    <fieldset ${!this.state.editable ? 'disabled="disabled"' : ''}>
                        <legend>Change Password</legend>
                        <table>
                            <thead>
                                <tr>
                                    <td colspan="2">
                                        ${this.state.response ? `<div class="${this.state.response.status === 200 ? 'success' : 'error'}">
                                            ${this.state.response.message}
                                        </div>` : "In order to change password, <br/>please modify this element and hit 'Update' below"}
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
                                    <td class="label"></td>
                                    <td>
                                        <button type="submit">Update Password</button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
            console.log("RENDER", this.state);
        }
    }
    customElements.define('userform-changepassword', HTMLUserChangePasswordFormElement);

}