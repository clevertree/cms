document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":content/:client/content.css");
});


class HTMLContentDeleteFormElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            message: "Editing content",
            status: 0,
            processing: false,
            content: {id: -1},
        };

        // this.state = {id:-1, flags:[]};
    }

    setState(newState) {
        for(let i=0; i<arguments.length; i++)
           Object.assign(this.state, arguments[i]);
        this.render();
    }


    connectedCallback() {
        // this.addEventListener('change', e => this.onChange(e));
        this.addEventListener('submit', e => this.onSubmit(e));

        const contentID = this.getAttribute('id');
        if(contentID) {
            this.setState({content: {id: contentID}});
        }

        this.render();
        this.requestFormData();
    }

    onSuccess(e, response) {
        console.log(response);
        if(response.redirect) {
            this.setState({processing: true});
            setTimeout(() => window.location.href = response.redirect, 3000);
        }
    }

    onError(e, response) {
        console.error(e, response);
    }

    onKeyUp(e) {
        const form = e.target.form; // querySelector('form.user-login-form');
        const request = this.getFormData(form);
        this.renderPreview(request.content);
        this.state.content.content = request.content;
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
        const request = this.getFormData(form);

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
        xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.responseType = 'json';
        xhr.send(JSON.stringify(request));
        this.setState({processing: true});
    }

    getFormData(form) {
        form = form || this.querySelector('form');
        const formData = {};
        new FormData(form).forEach((value, key) => formData[key] = value);
        return formData;
    }

    render() {
        console.log("RENDER", this.state);
        this.innerHTML =
            `<form action="/:content/${this.state.content.id}/:delete" method="POST" class="content content-delete themed">
            <input type="hidden" name="id" value="${this.state.content.id}" />
            <fieldset>
                <table class="content">
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
                            <td class="label">Content ID</td>
                            <td><a href=":content/${this.state.content.id}">${this.state.content.id}</a></td>
                        </tr>
                        <tr>
                            <td class="label">Title</td>
                            <td>${this.state.content.title}</td>
                        </tr>
                        <tr>
                            <td class="label">Path</td>
                            <td><a href="${this.state.content.path}">${this.state.content.path}</a></td>
                        </tr>
                        <tr>
                            <td class="label">Content</td>
                            <td>
                                <textarea disabled>${this.state.content.content}</textarea>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td colspan="2"><hr/></td></tr>
                        <tr>
                            <td style="text-align: right;" colspan="2">
                                <a href=":content/${this.state.content.id}">Back to content</a>
                                <button type="submit" ${!this.state.editable ? 'disabled="disabled"' : ''}>Delete Content</button>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </fieldset>
        </form>`;
    }
}
customElements.define('content-deleteform', HTMLContentDeleteFormElement);