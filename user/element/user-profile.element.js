document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("user/element/user.css");
});

{
    class HTMLUserProfileElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
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
            // this.addEventListener('change', this.onEvent);
            // this.addEventListener('submit', this.onEvent);

            this.render();
            const userID = this.getAttribute('id');
            if(userID)
                this.requestFormData(userID);
        }

        requestFormData(userID) {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                this.setState(xhr.response, {processing: false});
            };
            xhr.responseType = 'json';
            xhr.open ("GET", `:user/${userID}/:json?getAll=true`, true);
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.send ();
            this.setState({processing: true, user: {id: userID}});
        }


        render() {
            console.log("RENDER", this.state);
            this.innerHTML =
                `
                 <table class="user themed">
                    <tbody>
                    ${this.state.user ? `
                        <tr>
                            <th colspan="3">
                                User Profile
                            </th>
                        </tr>
                        <tr>
                            <th colspan="3">
                                <hr/>
                            </th>
                        </tr>
                        <tr>
                            <td class="label">ID</td>
                            <td colspan="2"><a href=":user/${this.state.user.id}">${this.state.user.id}</a></td>
                        </tr>
                        <tr>
                            <td class="label">Username</td>
                            <td colspan="2"><a href=":user/${this.state.user.username}">${this.state.user.username}</a></td>
                        </tr>
                        <tr>
                            <td class="label">Flags</td>
                            <td>[${(this.state.user.flags || ['none']).join(', ')}]</td>
                            <td>${this.state.editable ? `<a href=":user/${this.state.user.id}/:flags" class="icon-edit" title="Edit Flags">[&#x270D;]</a>` : ''}</td>
                        </tr>
                        <tr>
                            <td class="label">Email</td>
                            <td colspan="2">${this.state.user.email}</td>
                        </tr>
                        ${(this.state.profileConfig || []).map(profileField => `
                            <tr>
                                <td class="label">${profileField.title || profileField.name}</td>
                                <td>
                                    ${this.state.user.profile[profileField.name] || 'null'}
                                </td>
                                <td>${this.state.editable ? `<a href=":user/${this.state.user.id}/:profile" class="icon-edit" title="Edit Profile">[&#x270D;]</a>` : ''}</td>
                            </tr>
                        `).join('')}
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
    customElements.define('user-profile', HTMLUserProfileElement);

}