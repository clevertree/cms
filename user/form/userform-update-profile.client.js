document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("user/form/userform.css");
});

{
    class HTMLUserProfileFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                message: "In order to update this profile, please modify this form and hit 'Update Profile' below",
                status: 0,
                processing: false,
                editable: true,
                user: {id: -1, profile: {}},
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

            this.render();
            const userID = this.getAttribute('userID');
            if(userID)
                this.requestFormData(userID);
        }


        onSuccess(e, response) {
            console.log(e, response);
            if(response.redirect) {
                this.setState({processing: true});
                setTimeout(() => window.location.href = response.redirect, 3000);
            }
        }

        onError(e, response) {
            console.error(e, response);
        }

        onChange(e) {
            if(!this.state.user.profile)
                this.state.user.profile = {};
            if(e.target.name) // typeof this.state.user.profile[e.target.name] !== 'undefined')
                this.state.user.profile[e.target.name] = e.target.value;
        }

        requestFormData(userID) {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                this.setState({processing: false, editable: false}, xhr.response);
                if(this.state.sessionUser && this.state.user) {
                    if(this.state.sessionUser.flags.indexOf('admin') !== -1)
                        this.setState({editable: 'admin'});
                    else if (this.state.sessionUser.id === this.state.user.id)
                        this.setState({editable: 'user'});
                }
            };
            xhr.responseType = 'json';
            xhr.open ("GET", `:user/${userID}/:json?getAll=true`, true);
            xhr.send ();
            this.setState({processing: true});
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

        getFormData(form) {
            const formData = {};
            new FormData(form).forEach((value, key) => formData[key] = value);
            return formData;
        }

        renderProfileField(field) {
            const userProfile = this.state.user.profile || {};
            const value = userProfile[field.name];
            let attributeHTML = field.attributes || '';
            attributeHTML += field.class ? ` class="${field.class}"` : '';
            switch(field.type) {
                case 'textarea':
                    return `<textarea name="${field.name}" ${attributeHTML}>${value||''}</textarea>`;
                case 'select':
                    return `<select name="${field.name}" ${attributeHTML}></select>`;
                default:
                    return `<input name="${field.name}" type="${field.type||'text'}" value="${value||''}" ${attributeHTML}/>`;
            }
        }

        render() {
            // console.log("STATE", this.state);
            this.innerHTML =
                `
                <form action="/:user/${this.state.user.id}/:profile" method="POST" class="userform userform-update-profile themed">
                    <fieldset ${this.state.processing || this.state.editable === false ? 'disabled="disabled"' : null}>
                        <legend>Update Profile</legend>
                        <table>
                            <thead>
                                <tr>
                                    <td colspan="2">
                                        <div class="${this.state.status === 200 ? 'success' : (this.state.status === 0 ? '' : 'error')} status-${this.status}">
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
                            ${(this.state.profileConfig || []).map(profileField => `
                                <tr>
                                    <td class="label">${profileField.title || profileField.name}</td>
                                    <td>
                                        ${this.renderProfileField(profileField)}
                                    </td>
                                </tr>
                            `).join('')}
                            </tbody>
                            <tfoot>
                                <tr><td colspan="2"><hr/></td></tr>
                                    <td>
                                    </td>
                                    <td style="text-align: right;">
                                        <button type="submit">Update Profile</button>
                                    </td>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('userform-update-profile', HTMLUserProfileFormElement);

}