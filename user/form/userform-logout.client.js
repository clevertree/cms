document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("user/form/userform.css");
});

{
    class HTMLUserLogoutFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                message: "In order to end your session, please hit 'Log out' below",
                status: 0,
                email: "",
                password: ""
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
            this.state.userID = this.getAttribute('userID');
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
            if(typeof this.state[e.target.name] !== 'undefined')
                this.state[e.target.name] = e.target.value;
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

        render() {
            const messageClass = this.state.status === 200 ? 'success' : (!this.state.status ? 'message' : 'error');
            // console.log("STATE", this.state);
            this.innerHTML =
                `
                <form action="/:user/:logout" method="POST" class="userform userform-logout themed">
                    <fieldset ${this.state.processing ? 'disabled="disabled"' : null}>
                        <legend>Log Out</legend>
                            <table>
                                <thead>
                                    <tr>
                                        <td colspan="2">
                                            <div class="${messageClass} status-${this.state.status}">
                                                ${this.state.message}
                                            </div>
                                        </td>
                                    </tr>
                                </thead>
                                <tfoot>
                                    <tr><td colspan="2"><hr/></td></tr>
                                    <tr>
                                        <td>
                                        </td>
                                        <td style="text-align: right;">
                                            <button type="submit">Log Out</button>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                    </fieldset>
                </form>
`;
        }
    }
    customElements.define('userform-logout', HTMLUserLogoutFormElement);

}