document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("server/article/element/articleform.css");
});


class HTMLArticleFormEditorElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            article: {id: -1, flags:[]},
            history: []
        };
        // this.state = {id:-1, flags:[]};
    }

    setState(newState) {
        Object.assign(this.state, newState);
        this.render();
    }

    connectedCallback() {
        // this.addEventListener('change', this.onEvent);
        this.addEventListener('submit', this.onEvent);

        this.render();
        const articleID = this.getAttribute('id');
        if(articleID)
            this.requestFormData(articleID);
    }

    onSuccess(e, response) {
        // setTimeout(() => window.location.href = response.redirect, 3000);
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

    requestFormData(articleID) {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            // console.info(xhr.response);
            if(!xhr.response || !xhr.response.article)
                throw new Error("Invalid Response");
            this.setState(xhr.response);
            // this.state = xhr.response.user;
            // this.render();
        };
        xhr.responseType = 'json';
        xhr.open ("GET", `:article/${articleID}/json?getAll=true`, true);
        // xhr.setRequestHeader("Accept", "application/json");
        xhr.send ();
    }

    submit(e) {
        e.preventDefault();
        const form = e.target; // querySelector('element.user-login-element');
        this.setState({processing: true});
        const request = {};
        new FormData(form).forEach(function (value, key) {
            request[key] = value;
        });

        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
            console.log(e, xhr.response);
            const response = typeof xhr.response && xhr.response === 'object' ? xhr.response : {message: xhr.response};
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
    }



    render() {
        // console.log("RENDER", this.state);
        this.innerHTML =
            `<form action="/:article/${this.state.article.id}/edit" method="POST" class="form-article-edit themed">
            <input type="hidden" name="id" value="${this.state.article.id}" />
            <fieldset>
                <table style="width: 100%;">
                    <tbody>
                        <tr>
                            <th style="width: 65px;"></th>
                            <th></th>
                        </tr>
                        <tr>
                            <td class="label">Title</td>
                            <td>
                                <input type="text" name="title" value="${this.state.article.title||''}"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Path</td>
                            <td>
                                <input type="text" name="path" value="${this.state.article.path||''}" />
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Parent</td>
                            <td>
                                <input type="text" name="parent_id" placeholder="ID" size="3" value="${this.state.article.parent_id||''}" />
                                <select class="articleform-select-parent">
                                    <option value="">Select Parent</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Theme</td>
                            <td>
                                <select name="theme">
                                    <option value="">Default Site Theme</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Flags</td>
                            <td>
                                ${['Main-Menu', 'Sub-Menu', 'Account-Only', 'Admin-Only'].map(flagName => `
                                <label>
                                    <input type="checkbox" class="themed" name="flags[${flagName.toLowerCase()}]"  ${this.state.article.flags.indexOf(flagName) !== -1 ? 'checked="checked"' : null}" />
                                    ${flagName.replace('-', ' ')}
                                </label>
                                `).join('')}
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Content</td>
                            <td>
                                <textarea class="editor-plain editor-iframe-target" name="content" style="width: 100%; height: 400px; display: none;"
                                    >${this.state.article.content||''}</textarea>
                                <iframe class="editor-iframe editor-iframe-trumbowyg" src="/server/article/element/iframe-trumbowyg.html"
                                        style="width: 100%; height: 400px; overflow-x: hidden; border: 0px"></iframe>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Revision</td>
                            <td>
                                <select name="revision">
                                    <option value="">Load a revision</option>
                                ${this.state.history.map(revision => `
                                    <option value="${revision.created}">${new Date(revision.created).toLocaleString()}</option>
                                `)}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Preview</td>
                            <td>
                                <label>
                                    <select name="action">
                                        <option value="publish">Publish Now (No Preview)</option>
                                        <option value="draft">Save as Unpublished Draft</option>
                                    </select>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td class="label"></td>
                            <td>
                                <button type="submit">Publish</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </fieldset>
        </form>`;
    }
}
customElements.define('articleform-editor', HTMLArticleFormEditorElement);