document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("client/form/user-form/user-form.css");
});


class HTMLUserLoginFormElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            email: "",
            password: "",
        };
        // this.state = {id:-1, flags:[]};
    }

    render() {
        this.innerHTML =
            `<form action="/:user/login" method="POST" class="user-login-form themed">
            <fieldset>
                <table class="themed" style="width: 100%;">
                    <tbody>
                        <tr>
                            <td class="label">Email</td>
                            <td>
                                <input type="text" name="title" value="${this.state.email}"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Password</td>
                            <td>
                                <input type="password" name="path" value="${this.state.password}" />
                            </td>
                        </tr>
                        <tr>
                            <td class="label"></td>
                            <td>
                                <button type="submit">Log in</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </fieldset>
        </form>`;
    }

    connectedCallback() {
        this.addEventListener('change', this.onEvent);
        this.addEventListener('submit', this.onEvent);

        this.render();

        // const userID = this.getAttribute('user-id');
        // if(userID)
        //     this.requestFormData(userID);
    }

    onEvent(e) {
        switch(event.type) {
            case 'submit':
                e.preventDefault();
                this.submit();
                break;

            case 'change':
                break;
        }
    }

    submit() {
        const form = this.querySelector('form.user-login-form');
        const request = {};
        new FormData(form).forEach(function(value, key){
            request[key] = value;
        });

        const xhr = new XMLHttpRequest();
        xhr.onload = function(){ console.log (xhr.response); };
        xhr.open (form.method, form.action, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        // xhr.setRequestHeader("Accept", "application/json");
        xhr.responseType = 'json';
        xhr.send (JSON.stringify(request));
    }

    // requestFormData(userID) {
    //     const xhr = new XMLHttpRequest();
    //     xhr.onload = () => {
    //         console.info(xhr.response);
    //         if(!xhr.response.user)
    //             throw new Error("Invalid Response");
    //         this.state = xhr.response.user;
    //         this.render();
    //     };
    //     xhr.responseType = 'json';
    //     xhr.open ("GET", `:user/${userID}/json`, true);
    //     // xhr.setRequestHeader("Accept", "application/json");
    //     xhr.send ();
    // }
}
customElements.define('user-login-form', HTMLUserLoginFormElement);