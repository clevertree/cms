document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":content/:client/form/content-form.css");
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
            .map((input, i) => input.name + '=' + encodeURI(input.value))
            .join('&');
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
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.responseType = 'json';
        xhr.send(formValues);
        this.setState({processing: true});
    }

    render() {
        console.log("RENDER", this.state);
        this.innerHTML =
            `<form action="/:content/${this.state.content.id}/:delete" method="POST" class="content content-form-delete themed">
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
                                <textarea disabled>${this.state.content.data}</textarea>
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
customElements.define('content-form-delete', HTMLContentDeleteFormElement);