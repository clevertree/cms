document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("article/form/articleform.css");
});


class HTMLArticleFormAddElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
        };
    }

    setState(newState) {
        Object.assign(this.state, newState);
        this.render();
    }

    connectedCallback() {
        // this.addEventListener('change', this.onEvent);
        // this.addEventListener('keyup', this.onEvent);
        this.addEventListener('submit', this.onEvent);

        this.render();
    }

    onSuccess(e, response) {
        if(response.redirect)
            setTimeout(() => window.location.href = response.redirect, 2000);
    }
    onError(e, response) {}

    onEvent(e) {
        switch (event.type) {
            case 'submit':
                this.submit(e);
                break;
        }
    }

    submit(e) {
        e.preventDefault();
        const form = e.target; // querySelector('form.user-login-form');
        const request = this.getFormData(form);

        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
            console.log(e, xhr.response);
            const response = xhr.response && typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
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
        this.setState({processing: true});
    }

    getFormData() {
        const form = this.querySelector('form');
        const formData = {};
        if(form) {
            new FormData(form).forEach(function (value, key) {
                formData[key] = value;
            });
        }
        return formData;
    }

    render() {
        const formData = this.getFormData();

        // console.log("RENDER", this.state);
        this.innerHTML =
            `<form action="/:article/add" method="POST" class="articleform articleform-add themed">
            <fieldset>
                <table>
                    <thead>
                        <tr>
                            <td colspan="2">
                                ${this.state.response ? `<div class="${this.state.response.status === 200 ? 'success' : 'error'}">
                                    ${this.state.response.message}
                                </div>` : `Add a new article`}
                            </td>
                        </tr>
                        <tr><td colspan="2"><hr/></td></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th style="width: 65px;"></th>
                            <th></th>
                        </tr>
                        <tr>
                            <td class="label">Title</td>
                            <td>
                                <input type="text" name="title" value="${formData.title || ''}" required/>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td colspan="2"><hr/></td></tr>
                        <tr>
                            <td class="label"></td>
                            <td>
                                <button type="submit">Add</button>
                            </td>
                        </tr>
                    </tfoot>            
                </table>
            </fieldset>
        </form>`;
    }

}
customElements.define('articleform-add', HTMLArticleFormAddElement);