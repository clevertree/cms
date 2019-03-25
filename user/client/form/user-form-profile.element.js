document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserProfileElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                src: null,
                // message: "No Message",
                // status: 0,
                processing: false,
                editable: false,
                user: {id: -1, flags:[]}
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

        requestFormData() {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                this.setState({processing: false}, response);
            };
            xhr.responseType = 'json';
            xhr.open ('OPTIONS', this.state.src, true);
            xhr.send ();
            this.setState({processing: true});
        }

        render() {
            // console.log("RENDER", this.state);
            this.innerHTML =
                `
                 <table class="user themed">
                     <caption>User Profile</caption>
                    <tbody>
                    ${this.state.user ? `
                        <tr>
                            <td><label>ID:</label></td>
                            <td colspan="2"><a href=":user/${this.state.user.id}">${this.state.user.id}</a></td>
                        </tr>
                        <tr>
                            <td><label>Username:</label></td>
                            <td colspan="2"><a href=":user/${this.state.user.username}">${this.state.user.username}</a></td>
                        </tr>
                        <tr>
                            <td><label>Flags:</label></td>
                            <td>${(this.state.user.flags || ['none']).join(', ')}</td>
                            <td>${this.state.editable ? `<a href="${this.state.src}/:flags" class="icon-edit" title="Edit Flags">[&#x270D;]</a>` : ''}</td>
                        </tr>
                        <tr>
                            <td><label>Email:</label></td>
                            <td colspan="2">${this.state.user.email}</td>
                        </tr>
                        <tr><td colspan="3"><hr/></td></tr>
                        ${(this.state.profileConfig || []).map(profileField => `
                            <tr>
                                <td><label>${profileField.title || profileField.name}:</label></td>
                                <td>
                                    ${this.state.user.profile[profileField.name] || 'null'}
                                </td>
                                <td>${this.state.editable ? `<a href="${this.state.src}/:profile" class="icon-edit" title="Edit Profile">[&#x270D;]</a>` : ''}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td><label>Password:</label></td>
                            <td colspan="2"><a href="${this.state.src}/:password">Edit</a></td>
                        </tr>
                        <tr><td colspan="3"><hr/></td></tr>
                        <tr>
                            <td colspan="2" style="text-align: center;"><a href="${this.state.src}/:message">Send a Message</a></td>
                        </tr>
                    ` : `
                        <tr>
                            <th colspan="2">
                                ${this.state.message}
                            </th>
                        </tr>
                    `}
                    </tbody>
                </table>
`;
        }
    }
    customElements.define('user-form-profile', HTMLUserProfileElement);

}