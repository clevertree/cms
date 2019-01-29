document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("user/form//userform.css");
});

{
    class HTMLUserFlagFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                user: {id: -1, flags:[]}
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
                        this.state.user.flags[e.target.name] = value;
                    if(e.target.getAttribute('type') === 'checkbox') {
                        if(e.target.checked) {
                            this.state.user.flags =
                                this.state.user.flags.concat(e.target.name)
                                    .filter((v, i, a) => a.indexOf(v) === i);
                        } else {
                            this.state.user.flags =
                                this.state.user.flags.filter((v) => v !== e.target.name);
                        }
                    }
                    console.log(this.state);
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
                this.setState({response, user:response.user, processing: false});
            };
            xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.responseType = 'json';
            xhr.send(JSON.stringify(request));
        }

        render() {
            console.log("RENDER", this.state);
            this.innerHTML =
                `
                <form action="/:user/${this.state.user.id}/flags" method="POST" class="userform userform-flags themed">
                    <fieldset ${this.state.editable !== 'admin' ? 'disabled="disabled"' : ''}>
                        <legend>Update User Flags</legend>
                        <table>
                            <thead>
                                <tr>
                                    <td colspan="2">
                                        ${this.state.response ? `<div class="${this.state.response.status === 200 ? 'success' : 'error'}">
                                            ${this.state.response.message}
                                        </div>` : "In order to update this flag, <br/>please modify this form and hit 'Update' below"}
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
                                <tr>
                                    <td class="label">Flags</td>
                                    <td>
                                        ${['admin'].map(flagName => `
                                        <label>
                                            <input type="checkbox" class="themed" name="${flagName.toLowerCase()}" value="1" ${this.state.user.flags.indexOf(flagName) !== -1 ? 'checked="checked"' : null}" />
                                            ${flagName.replace('-', ' ')}
                                        </label>
                                        `).join('')}
                                    </td>
                                </tr>
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
    customElements.define('userform-flags', HTMLUserFlagFormElement);

}