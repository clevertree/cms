document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("server/user/element/userform.css");
});

{
    class HTMLUserProfileFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                user: {id: -1, profile: {}},
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
            const userID = this.getAttribute('id');
            if(userID)
                this.requestFormData(userID);
        }

        onSuccess(e, response) {
            // setTimeout(() => window.location.href = response.redirect, 3000);
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
                    if(e.target.name && typeof this.state.user.profile[e.target.name] !== 'undefined')
                        this.state.user.profile[e.target.name] = value;
                    // console.log(this.state);
                    break;
            }
        }

        requestFormData(userID) {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                // console.info(xhr.response);
                if(!xhr.response || !xhr.response.user)
                    throw new Error("Invalid Response");
                this.setState(xhr.response);
                // this.state = xhr.response.user;
                // this.render();
            };
            xhr.responseType = 'json';
            xhr.open ("GET", `:user/${userID}/json?getAll=true`, true);
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
                this.setState({response, user:response.user, processing: false});
            };
            xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.responseType = 'json';
            xhr.send(JSON.stringify(request));
        }

        renderProfileField(field) {
            const value = this.state.user.profile[field.name];
            switch(field.type) {
                case 'textarea':
                    return `<textarea name="${field.name}" class="${field.class}" ${field.attributes}>${value||''}</textarea>`;
                case 'select':
                    return `<select name="${field.name}" class="${field.class}" ${field.attributes}></select>`;
                default:
                    return `<input name="${field.name}" type="${field.type||'text'}" class="${field.class}" value="${value||''}" ${field.attributes}/>`;
            }
        }

        render() {
            let profileFields = [];
            if(this.state.profileConfig) {
                profileFields = this.state.profileConfig.slice(0);
                if(this.state.user.profile) {
                    Object.keys(this.state.user.profile).forEach(key => {
                        for (var i = 0; i < profileFields.length; i++) {
                            if (profileFields[i].name === key)
                                return;
                        }
                        profileFields.push({
                            name: key
                        })
                    });
                }
            }
            console.log("RENDER", this.state);
            this.innerHTML =
                `
                <form action="/:user/${this.state.user.id}/profile" method="POST" class="userform userform-profile themed">
                    <fieldset ${!this.state.editable ? 'disabled="disabled"' : ''}>
                        <legend>Update Profile</legend>
                        <table>
                            <thead>
                                <tr>
                                    <td colspan="2">
                                        ${this.state.response ? `<div class="${this.state.response.status === 200 ? 'success' : 'error'}">
                                            ${this.state.response.message}
                                        </div>` : "In order to update this profile, <br/>please modify this element and hit 'Update' below"}
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
                            ${profileFields.map(profileField => `
                                <tr>
                                    <td class="label">${profileField.name}:</td>
                                    <td>
                                        ${this.renderProfileField(profileField)}
                                    </td>
                                </tr>
                            `).join('')}
                            </tbody>
                            <tfoot>
                                <tr><td colspan="2"><hr/></td></tr>
                                <tr>
                                    <td class="label"></td>
                                    <td>
                                        <button type="submit">Update</button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('userform-profile', HTMLUserProfileFormElement);

}