document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("user/form//userform.css");
});

{
    class HTMLUserLogoutFormElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                email: "",
                password: "",
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
            const userID = this.getAttribute('user-id');
            if(userID)
                this.requestFormData(userID);
        }

        onSuccess(e, response) {
            setTimeout(() => window.location.href = response.redirect, 3000);
        }
        onError(e, response) {}

        onEvent(e) {
            switch (event.type) {
                case 'submit':
                    this.submit(e);
                    break;

                case 'change':
                    break;
            }
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
                this.setState({response, processing: false});
            };
            xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            // xhr.setRequestHeader("Accept", "application/json");
            xhr.responseType = 'json';
            xhr.send(JSON.stringify(request));
        }

        render() {
            this.innerHTML =
                `
        <form action="/:user/:logout" method="POST" class="userform userform-logout themed">
            <fieldset>
                <legend>Log Out</legend>
                    <table>
                        <thead>
                            <tr>
                                <td colspan="2">
                                    ${this.state.response ? `<div class="${this.state.response.status === 200 ? 'success' : 'error'}">
                                        ${this.state.response.message}
                                    </div>` : "In order to end your session, <br/>please hit 'Log out' below"}
                                </td>
                            </tr>
                        </thead>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td class="label"></td>
                                <td>
                                    <button type="submit">Log out</button>
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