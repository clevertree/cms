document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserUpdatepasswordElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                src: null,
                message: "In order to change password, please fill out this form and hit 'Update' below",
                status: 0,
                user: {id: -1},
                require_old_password: true,
                password_old: null,
                password_new: null,
                password_confirm: null,
            };
            // this.state = {id:-1, resetpasswords:[]};
        }

        setState(newState) {
            for(let i=0; i<arguments.length; i++)
                Object.assign(this.state, arguments[i]);
            this.render();
        }

        connectedCallback() {
            this.addEventListener('change', e => this.onChange(e));
            this.addEventListener('submit', e => this.onSubmit(e));

            const src = this.getAttribute('src');
            if(src) {
                this.setState({src});
                this.requestFormData();
            } else {
                this.setState({message: "attribute src=':/user/[userID]' required", status: 400});
            }

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

        requestFormData() {
            const form = this.querySelector('form');
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                this.setState({processing: false}, xhr.response);
            };
            xhr.responseType = 'json';
            xhr.open ('OPTIONS', form.getAttribute('action'), true);
            xhr.send ();
            this.setState({processing: true});
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
            this.innerHTML =
                `
               <form action="${this.state.src}/:password" method="POST" class="user user-form-updatepassword themed">
                    <table class="user themed">
                        <caption>Change Password</caption>
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
                                <td><label for="email">Email</label></td>
                                <td>
                                    <input type="email" name="email" id="email" value="${this.state.user.email}" disabled/>
                                </td>
                            </tr>
                            ${this.state.require_old_password ? `
                            <tr>
                                <td><label for="password_old">Old Password</label></td>
                                <td>
                                    <input type="password" name="password_old" id="password_old" value="${this.state.password_old||''}" required />
                                </td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td><label for="password_new">New Password</label></td>
                                <td>
                                    <input type="password" name="password_new" id="password_new" value="${this.state.password_new||''}" required />
                                </td>
                            </tr>
                            <tr>
                                <td><label for="password_confirm">Confirm Password</label></td>
                                <td>
                                    <input type="password" name="password_confirm" id="password_confirm" value="${this.state.password_confirm||''}" required />
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td>
                                </td>
                                <td style="text-align: right;">
                                    <button type="submit" ${this.state.processing || this.state.editable === false ? 'disabled="disabled"' : null}>Update Password</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </form>
`;
        }
    }
    customElements.define('user-form-updatepassword', HTMLUserUpdatepasswordElement);

}