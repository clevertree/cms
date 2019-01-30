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
                userID: -1,
                message: "Loading Profile.."
            };
            // this.state = {id:-1, flags:[]};
        }

        setState(newState) {
            Object.assign(this.state, newState);
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
                // console.info(xhr.response);
                // if(!xhr.response || !xhr.response.user)
                //     throw new Error("Invalid Response");
                this.setState(xhr.response);
                this.setState({processing: false});
                // this.state = xhr.response.user;
                // this.render();
            };
            xhr.responseType = 'json';
            xhr.open ("GET", `:user/${userID}/:json?getAll=true`, true);
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.send ();
            this.setState({processing: true, userID: userID});
        }

        render() {
            console.log("RENDER", this.state);
            this.innerHTML =
                `
                 <table class="themed">
                    <tbody>
                    ${this.state.user ? `
                        <tr>
                            <th colspan="2">User Profile<hr/></th>
                        </tr>
                        <tr>
                            <td class="label">ID</td>
                            <td>${this.state.userID}</td>
                        </tr>
                        <tr>
                            <td class="label">Email</td>
                            <td>${this.state.user.email}</td>
                        </tr>
                        <tr>
                            <td class="label">Flags</td>
                            <td>${this.state.user.flags.join(', ')}</td>
                        </tr>
                        ${this.state.user.profile && Object.keys(this.state.user.profile).map(key => `
                        <tr>
                            <td class="label">${key}</td>
                            <td>${this.state.user.profile[key]}</td>
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