document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("client/form/article-editor/article-editor.css");


    const formEditArticle = document.querySelector('form.form-article-edit');

    if(formEditArticle) {
        // Populate Form Data
        formEditArticle.loadArticle = function(id) {
            const xhr = new XMLHttpRequest();
            xhr.onload = (e) => {
                const json = xhr.response;
                for(let i=0; i<formEditArticle.elements.length; i++) {
                    const input = formEditArticle.elements[i];
                    if(input.name && typeof json[input.name] !== 'undefined' && json[input.name] !== null)
                        input.value = json[input.name];
                }
            };
            xhr.responseType = 'json';
            xhr.open ("GET", `:article/${id}/edit`, true);
            xhr.setRequestHeader("Accept", "application/json");
            xhr.send ();
        };

        // Submit Form
        formEditArticle.onSubmit = function(e) {
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
        };

        // Submit Form
        // formEditArticle.onChange = function(e) {
        //     e.preventDefault();
        //     const form = e.target;
        //     const data = new FormData(form);
        //     const iframes = document.querySelectorAll('iframe.editor-iframe');
        //     iframes.forEach(iframe => {
        //         iframe.contentWindow.document.dispatchEvent(new CustomEvent('editor:set', {
        //             detail: data.get('content')
        //         }))
        //     })
        // };

        // formEditArticle.addEventListener('submit', formEditArticle.onSubmit);
        // formEditArticle.addEventListener('change', formEditArticle.onChange);

        const loadArticleID = new FormData(formEditArticle).get('id');
        if(loadArticleID) {
            console.log("Loading article ID " + loadArticleID);
            formEditArticle.loadArticle(loadArticleID);
        }
    }
});


class ArticleEditor {
    constructor(container) {
        this.container = typeof container === "string" ? document.querySelector(container) : container;
        this.article = {id:-1};
    }

    render() {

        const html =
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
                                <iframe class="editor-iframe editor-iframe-trumbowyg" src="/client/form/article-editor/iframe-trumbowyg.html"
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
        if(this.container)
            this.container.innerHTML = html;
        return html;
    }

    loadArticle(articleID) {
        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
            this.article = xhr.response;
            this.render();
        };
        xhr.responseType = 'json';
        xhr.open ("GET", `:article/${articleID}/edit`, true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.send ();
    }
}