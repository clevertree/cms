document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserUpdateflagsElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                src: null,
                method: 'POST',
                message: "In order to update this user's flags, please modify this form and hit 'Update' below",
                status: 0,
                processing: false,
                editable: false,
                flagList: [],
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

        onSuccess(response) {
            console.log(response);
            if(response.redirect) {
                this.setState({processing: true});
                setTimeout(() => window.location.href = response.redirect, 2000);
            }
        }

        onError(response) {
            console.error(response.message || 'Error: ', response);
        }

        onChange(e) {

            const form = e.target.form;
            const newFlags = [];
            for(let i=0; i<form.elements.length; i++) {
                const elm = form.elements[i];
                if(elm.name && elm.getAttribute('type') === 'checkbox' && elm.checked === true)
                    newFlags.push(elm.name);
            }
            this.state.user.flags = newFlags;
            this.render();
            // console.log(this.state.user.flags);
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
                .map((input, i) => input.name + '=' + encodeURIComponent(input.value))
                .join('&');
            const method = form.getAttribute('method');
            const action = form.getAttribute('action');

            const xhr = new XMLHttpRequest();
            xhr.onload = (e) => {
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                this.setState({processing: false, status: xhr.status}, response);
                if(xhr.status === 200) {
                    this.onSuccess(response);
                } else {
                    this.onError(response);
                }
            };
            xhr.open(method, action, true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.responseType = 'json';
            xhr.send(formValues);
            this.setState({processing: true});
        }

        render() {
            console.log("STATE", this.state);
            this.innerHTML =
                `
                <form action="${this.state.src}/:flags" method="POST" class="user user-form-updateflags themed">
                    <table class="user themed">
                        <caption>Update User Flags</caption>
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
                                <td><label>User ID:</label></td>
                                <td><a href=":user/${this.state.user.id}">${this.state.user.id}</a></td>
                            </tr>
                            <tr>
                                <td><label>Username:</label></td>
                                <td><a href=":user/${this.state.user.username}">${this.state.user.username}</a></td>
                            </tr>
                            <tr>
                                <td><label>Flags:</label></td>
                                <td>
                                    ${Object.keys(this.state.flagList).map(flagName => `
                                    <label>
                                        <input type="checkbox" class="themed" name="${flagName}" value="1" 
                                            ${this.state.user.flags.indexOf(flagName) !== -1 ? 'checked="checked"' : null}" 
                                            ${flagName.indexOf(':') !== -1 && this.state.user.flags.indexOf(flagName.split(':')[0]) === -1 ? 'disabled="disabled"' : null}" 
                                            />
                                        ${this.state.flagList[flagName]}
                                    </label>
                                    <br/>
                                    `).join('')}
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td>
                                </td>
                                <td style="text-align: right;">
                                    <button type="submit" class="themed" ${this.state.processing || this.state.editable === false ? 'disabled="disabled"' : null}>Update Flags</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </form>
`;
        }
    }
    customElements.define('user-form-updateflags', HTMLUserUpdateflagsElement);
}