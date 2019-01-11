document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("client/form/article-form/article-form.css");
});


class HTMLFormArticleEditorElement extends HTMLElement {
    constructor() {
        super();
        this.article = {id:-1, flags:[]};
    }

    connectedCallback() {
        // this.editor = this.closest('music-editor'); // Don't rely on this !!!
        this.addEventListener('change', this.onSubmit);
        // this.addEventListener('input', this.onSubmit);
        this.addEventListener('submit', this.onSubmit);

        this.render();

        const articleID = this.getAttribute('article-id');
        if(articleID)
            this.loadArticle(articleID);
    }


    submit(e) {
        e.preventDefault();
        const form = e.target;
        const request = {};
        new FormData(form).forEach(function(value, key){
            request[key] = value;
        });

        const xhr = new XMLHttpRequest();
        xhr.onload = function(){ console.log (xhr.response); };
        xhr.open (form.method, form.action, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.setRequestHeader("Accept", "application/json");
        xhr.responseType = 'json';
        xhr.send (JSON.stringify(request));
    }

    loadArticle(articleID) {
        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
            console.info(xhr.response);
            if(!xhr.response.article)
                throw new Error("Invalid Response");
            this.article = xhr.response.article;
            this.render();
        };
        xhr.responseType = 'json';
        xhr.open ("GET", `:article/${articleID}/edit`, true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.send ();
    }

    render() {
        this.innerHTML =
            `<form action="/:article/${this.article.id}/edit" method="POST" class="form-article-edit themed">
            <input type="hidden" name="id" value="${this.article.id}" />
            <fieldset>
                <table class="themed" style="width: 100%;">
                    <tbody>
                        <tr>
                            <th style="width: 65px;"></th>
                            <th></th>
                        </tr>
                        <tr>
                            <td class="label">Title</td>
                            <td>
                                <input type="text" name="title" value="${this.article.title}"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Path</td>
                            <td>
                                <input type="text" name="path" value="${this.article.path}" />
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Parent</td>
                            <td>
                                <input type="text" name="parent_id" placeholder="ID" size="3" value="${this.article.parent_id}" />
                                <select class="article-form-select-parent">
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
                                    <input type="checkbox" class="themed" name="flags[${flagName.toLowerCase()}]"  ${this.article.flags.indexOf(flagName) !== -1 ? 'checked="checked"' : null}" />
                                    ${flagName.replace('-', ' ')}
                                </label>
                                `).join('')}
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Content</td>
                            <td>
                                <textarea class="editor-plain editor-iframe-target" name="content" style="width: 100%; height: 400px; display: none;">${this.article.content}</textarea>
                                <iframe class="editor-iframe editor-iframe-trumbowyg" src="/client/form/article-form/iframe-trumbowyg.html"
                                        style="width: 100%; height: 400px; overflow-x: hidden; border: 0px"></iframe>
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
customElements.define('article-form', HTMLFormArticleEditorElement);