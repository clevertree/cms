document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("article/element/article.css");
});


class HTMLArticleDeleteFormElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            message: "Editing article",
            status: 0,
            processing: false,
            article: {id: -1},
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

        const articleID = this.getAttribute('id');
        if(articleID) {
            this.setState({article: {id: articleID}, mode: 'edit'});
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
        this.state.article.content = request.content;
    }


    requestFormData() {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            // console.info(xhr.response);
            if(!xhr.response || !xhr.response.article)
                throw new Error("Invalid Response");
            this.setState({processing: false}, xhr.response);
            // this.state = xhr.response.user;
            // this.render();
        };
        xhr.responseType = 'json';
        let params = 'getAll=true';
        if(this.state.revisionID)
            params += `&r=${this.state.revisionID}`;
        params += '&t=' + new Date().getTime();
        xhr.open ("GET", `:article/${this.state.article.id}/:json?${params}`, true);
        // xhr.setRequestHeader("Accept", "application/json");
        xhr.send ();
        this.setState({processing: true});
    }

    onSubmit(e) {
        if(e) e.preventDefault();
        const form = e ? e.target : this.querySelector('form');
        const request = this.getFormData(form);
        const method = form.getAttribute('method');
        const action = form.getAttribute('action');

        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
            const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
            this.setState({status: xhr.status, processing: false}, response);
            if(xhr.status === 200) {
                this.onSuccess(e, response);
            } else {
                this.onError(e, response);
            }
        };
        xhr.open(method, action, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.responseType = 'json';
        if(!confirm("Are you sure you want to delete article #" + this.state.article.id + "?"))
            throw new Error("Submit canceled");
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
        // const formData = this.getFormData();
        let action = `/:article/${this.state.article.id}/:delete`;
        let message = `Delete article ID ${this.state.article.id}?`;
        if(this.state.message)
            message = this.state.message;

        console.log("RENDER", this.state);
        this.innerHTML =
            `<form action="${action}" method="POST" class="article article-delete themed">
            <input type="hidden" name="id" value="${this.state.article.id}" />
            <fieldset ${!this.state.editable ? 'disabled="disabled"' : ''}>
                <table class="article">
                    <thead>
                        <tr>
                            <td colspan="2">
                            <div class="${this.state.status === 200 ? 'success' : (!this.state.status ? 'message' : 'error')} status-${this.state.status}">
                                ${message}
                            </div>
                            </td>
                        </tr>
                        <tr><td colspan="2"><hr/></td></tr>
                    </thead>
                    <tbody class="themed">
                        <tr>
                            <td class="label">Article ID</td>
                            <td><a href=":article/${this.state.article.id}">${this.state.article.id}</a></td>
                        </tr>
                        <tr>
                            <td class="label">Title</td>
                            <td>${this.state.article.title}</td>
                        </tr>
                        <tr>
                            <td class="label">Path</td>
                            <td><a href="${this.state.article.path}">${this.state.article.path}</a></td>
                        </tr>
                        <tr>
                            <td class="label">Content</td>
                            <td>
                                <textarea disabled>${this.state.article.content}</textarea>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td colspan="2"><hr/></td></tr>
                        <tr>
                            <td style="text-align: right;" colspan="2">
                                <a href=":article/${this.state.article.id}">Back to article</a>
                                <button type="submit">Delete Article</button>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </fieldset>
        </form>`;
    }
}
customElements.define('article-deleteform', HTMLArticleDeleteFormElement);