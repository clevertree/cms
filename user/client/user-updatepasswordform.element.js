document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/user.css");
});

{
    class HTMLUserUpdatePasswordFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                src: null,
                method: 'POST',
                message: "In order to change password, please fill out this form and hit 'Update' below",
                status: 0,
                user: {id: -1},
                require_old_password: true,
                password_old: null,
                password_new: null,
                password_confirm: null,
            };
            // this.state = {id:-1, changepasswords:[]};
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
            const request = this.getFormData();

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
            xhr.open(this.state.method, this.state.action, true);
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
            this.innerHTML =
                `
               <form action="${this.state.src}/:password" method="POST" class="user user-updatepasswordform themed">
                    <fieldset ${this.state.processing || this.state.editable === false ? 'disabled="disabled"' : null}>
                        <legend>Change Password</legend>
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
                                    <td class="label">Email</td>
                                    <td>
                                        <input type="email" name="email" value="${this.state.user.email}" disabled/>
                                    </td>
                                </tr>
                                ${this.state.require_old_password ? `
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
                                <tr>
                                    <td class="label">Confirm Password</td>
                                    <td>
                                        <input type="password" name="password_confirm" value="${this.state.password_confirm||''}" required />
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td>
                                    </td>
                                    <td style="text-align: right;">
                                        <button type="submit">Update Password</button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('user-updatepasswordform', HTMLUserUpdatePasswordFormElement);

}