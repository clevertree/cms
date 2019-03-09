document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserUpdateProfileElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                src: null,
                action: null,
                method: 'POST',
                message: "In order to update this profile, please modify this form and hit 'Update Profile' below",
                status: 0,
                user: {id: -1, profile: {}},
                processing: false,
                editable: true,
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
            if(!this.state.user.profile)
                this.state.user.profile = {};
            if(e.target.name) // typeof this.state.user.profile[e.target.name] !== 'undefined')
                this.state.user.profile[e.target.name] = e.target.value;
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
                <form action="${this.state.src}/:profile" method="POST" class="user user-form-updateprofile themed">
                   <fieldset>
                        <legend>Update Profile</legend>
                        <table class="user themed">
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
                                    <td class="label">User ID</td>
                                    <td><a href=":user/${this.state.user.id}">${this.state.user.id}</a></td>
                                </tr>
                                <tr>
                                    <td class="label">Username</td>
                                    <td><a href=":user/${this.state.user.username}">${this.state.user.username}</a></td>
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
                                        <button type="submit" ${this.state.processing || this.state.editable === false ? 'disabled="disabled"' : null}>Update Profile</button>
                                    </td>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('user-form-updateprofile', HTMLUserUpdateProfileElement);

}