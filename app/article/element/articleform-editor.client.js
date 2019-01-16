document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("app/article/element/articleform.css");
});


class HTMLArticleFormEditorElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            revisionDate: null,
            editor: sessionStorage.getItem("articleform-editor:editor"),
            article: {id: -1},
            revision: {},
            history: [],
            parentList: [],
        };
        this.renderEditorTimeout = null;
        this.removeWYSIWYGEditor = null;
        this.loadedScripts = {};

        // this.state = {id:-1, flags:[]};
    }

    setState(newState) {
        Object.assign(this.state, newState);
        this.render();
    }

    connectedCallback() {
        this.addEventListener('change', this.onEvent);
        this.addEventListener('submit', this.onEvent);

        const articleID = this.getAttribute('id');
        if(articleID) {
            this.setState({article: {id: articleID}})
            this.requestFormData();
        }
        this.render();
    }

    onSuccess(e, response) {
        if(response.redirect)
            setTimeout(() => window.location.href = response.redirect, 3000);
    }
    onError(e, response) {}

    onEvent(e) {
        switch (event.type) {
            case 'submit':
                this.submit(e);
                break;

            case 'change':
                switch(e.target.name) {
                    case 'revision':
                        const revisionDate = e.target.value;
                        console.log("Load Revision: " + revisionDate);
                        // this.setState({revisionDate});
                        this.setState({revisionDate});
                        this.requestFormData();
                        break;
                    case 'editor':
                        this.state.editor = e.target.value;
                        sessionStorage.setItem("articleform-editor:editor",this.state.editor);
                        this.renderWYSIWYGEditor();
                        break;
                }
                break;
        }
    }

    requestFormData() {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            this.setState({processing: false});
            // console.info(xhr.response);
            if(!xhr.response || !xhr.response.article)
                throw new Error("Invalid Response");
            this.setState(xhr.response);
            // this.state = xhr.response.user;
            // this.render();
        };
        xhr.responseType = 'json';
        xhr.open ("GET", `:article/${this.state.article.id}/json?getAll=true&getRevision=${new Date(this.state.revisionDate).getTime()}`, true);
        // xhr.setRequestHeader("Accept", "application/json");
        xhr.send ();
        this.setState({processing: true});
    }

    submit(e) {
        e.preventDefault();
        const form = e.target; // querySelector('element.user-login-element');
        const request = {};
        new FormData(form).forEach(function (value, key) {
            request[key] = value;
        });

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




    render() {
        const articleFlags = this.state.article.flags || [];
        // console.log("RENDER", this.state);
        this.innerHTML =
            `<form action="/:article/${this.state.article.id}/edit" method="POST" class="articleform articleform-editor themed">
            <input type="hidden" name="id" value="${this.state.article.id}" />
            <fieldset ${!this.state.editable ? 'disabled="disabled"' : ''}>
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <td colspan="2">
                                ${this.state.response ? `<div class="${this.state.response.status === 200 ? 'success' : 'error'}">
                                    ${this.state.response.message}
                                </div>` : `Editing article ID ${this.state.article.id}`}
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
                                <input type="text" name="title" value="${this.state.article.title || ''}"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Path</td>
                            <td>
                                <input type="text" name="path" value="${this.state.article.path || ''}" />
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Parent</td>
                            <td>
                                <select name="parent_id" onchange="this.form.parent_id.value = this.value;" class="articleform-select-parent">
                                    <option value="">Select Parent</option>
                                ${this.state.parentList.map(article => `
                                    <option value="${article.id}" ${this.state.article.parent_id === article.id ? 'selected="selected"' : null}>
                                        ${article.title} ${article.path ? `(${article.path})` : null}
                                    </option>
                                `)}
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
                                    <input type="checkbox" class="themed" name="flags[${flagName.toLowerCase()}]"  ${articleFlags.indexOf(flagName) !== -1 ? 'checked="checked"' : null}" />
                                    ${flagName.replace('-', ' ')}
                                </label>
                                `).join('')}
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Content</td>
                            <td>
                                <textarea class="editor-plain editor-wysiwyg-target" name="content"
                                    >${this.state.revision.content || this.state.article.content || ''}</textarea>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">WYSIWYG Editor</td>
                            <td>
                                <label>
                                    <select name="editor">
                                    ${[
                                        ['', 'Plain Text / HTML'],
                                        ['summernote', 'SummerNote'], 
                                        ['pell', 'Pell'], 
                                        ['trumbowyg', 'Trumbowyg'], 
                                        ['froala', 'Froala (Not free)']
                                    ].map(option => `
                                        <option value="${option[0]}"${option[0] === this.state.editor ? ' selected="selected"' : ''}>${option[1]}</option>
                                    `)}
                                    </select>
                                </label>
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

        clearTimeout(this.renderEditorTimeout);
        this.renderEditorTimeout = setTimeout(e => this.renderWYSIWYGEditor(), 100);
    }

    renderWYSIWYGEditor() {
        // console.log("RENDER", this.state);
        switch(this.state.editor) {
            default:
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                break;

            case 'pell':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();

                this.loadScripts([
                    'node_modules/pell/dist/pell.min.js',
                ], () => {
                    const target = document.querySelector('.editor-wysiwyg-target');
                // Initialize pell on an HTMLElement
                    pell.init({
                        // <HTMLElement>, required
                        element: target,

                        // <Function>, required
                        // Use the output html, triggered by element's `oninput` event
                        onChange: html => console.log(html),

                        // <string>, optional, default = 'div'
                        // Instructs the editor which element to inject via the return key
                        defaultParagraphSeparator: 'div',

                        // <boolean>, optional, default = false
                        // Outputs <span style="font-weight: bold;"></span> instead of <b></b>
                        styleWithCSS: false,

                        // <Array[string | Object]>, string if overwriting, object if customizing/creating
                        // action.name<string> (only required if overwriting)
                        // action.icon<string> (optional if overwriting, required if custom action)
                        // action.title<string> (optional)
                        // action.result<Function> (required)
                        // Specify the actions you specifically want (in order)
                        actions: [
                            'bold',
                            {
                                name: 'custom',
                                icon: 'C',
                                title: 'Custom Action',
                                result: () => console.log('Do something!')
                            },
                            'underline'
                        ],

                        // classes<Array[string]> (optional)
                        // Choose your custom class names
                        classes: {
                            actionbar: 'pell-actionbar',
                            button: 'pell-button',
                            content: 'pell-content',
                            selected: 'pell-button-selected'
                        }
                    });


                    console.log("Loaded pell WYSIWYG Editor", target);
                    // this.removeWYSIWYGEditor = () => {
                    //     // target.trumbowyg('destroy');
                    //     // console.log("Unloaded pell WYSIWYG Editor", target);
                    // };
                });

                [
                    'node_modules/pell/dist/pell.min.css',
                ].forEach(INCLUDE_CSS => {
                    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
                        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
                });

                break;

            case 'trumbowyg':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();

                this.loadScripts([
                    'https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js',
                    'https://rawgit.com/RickStrahl/jquery-resizable/master/dist/jquery-resizable.min.js',

                    'node_modules/trumbowyg/dist/trumbowyg.min.js',
                    'node_modules/trumbowyg/dist/plugins/cleanpaste/trumbowyg.cleanpaste.min.js',
                    'node_modules/trumbowyg/dist/plugins/pasteimage/trumbowyg.pasteimage.min.js'
                ], () => {
                    const target = jQuery('.editor-wysiwyg-target');
                    target.trumbowyg();
                    console.log("Loaded Trumbowyg WYSIWYG Editor", target);
                    this.removeWYSIWYGEditor = () => {
                        const target = jQuery('.editor-wysiwyg-target');
                        target.trumbowyg('destroy');
                        console.log("Unloaded Trumbowyg WYSIWYG Editor", target);
                    };
                });

                [
                    'node_modules/trumbowyg/dist/ui/trumbowyg.min.css'
                ].forEach(INCLUDE_CSS => {
                    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
                        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
                });

                break;

            case 'summernote':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                [
                    'https://netdna.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.css',
                    'https://cdnjs.cloudflare.com/ajax/libs/summernote/0.8.11/summernote.css',
                ].forEach(INCLUDE_CSS => {
                    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
                        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
                });

                this.loadScripts([
                    'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.js',
                    'https://netdna.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/summernote/0.8.11/summernote.js'
                ], () => {
                    const target = jQuery('.editor-wysiwyg-target');
                    target.summernote();
                    console.log("Loaded Froala WYSIWYG Editor", target);

                    this.removeWYSIWYGEditor = () => {
                        const target = jQuery('.editor-wysiwyg-target');
                        target.summernote('destroy');
                        console.log("Unloaded Froala WYSIWYG Editor", target);
                    };
                });

                break;

            case 'froala':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                [
                    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
                    'https://cdn.jsdelivr.net/npm/froala-editor@2.9.0/css/froala_editor.pkgd.min.css',
                    'https://cdn.jsdelivr.net/npm/froala-editor@2.9.0/css/froala_style.min.css',
                ].forEach(INCLUDE_CSS => {
                    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
                        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
                });

                this.loadScripts([
                    'https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js',
                    'https://cdn.jsdelivr.net/npm/froala-editor@2.9.0/js/froala_editor.pkgd.min.js'
                ], () => {
                    const target = jQuery('.editor-wysiwyg-target');
                    target.froalaEditor();
                    console.log("Loaded Froala WYSIWYG Editor", target);
                    this.removeWYSIWYGEditor = () => {
                        const target = jQuery('.editor-wysiwyg-target');
                        target.froalaEditor('destroy');
                        console.log("Unloaded Froala WYSIWYG Editor", target);
                    };
                });


                break;
        }
    }

    loadScripts(scriptPaths, onLoaded) {
        if(scriptPaths.length === 0)
            return onLoaded && onLoaded();
        const scriptPath = scriptPaths.shift();
        this.loadScript(scriptPath, () => {
            this.loadScripts(scriptPaths, onLoaded);
        });
    }

    loadScript(scriptPath, onLoaded) {
        if(typeof this.loadedScripts[scriptPath] !== "undefined") {
            if(!onLoaded)
                return;
            if(this.loadedScripts[scriptPath].loaded === true) {
                onLoaded();
            } else {
                this.loadedScripts[scriptPath].onLoad.push(onLoaded);
            }
            return;
        }
        const loadedScript = {path: scriptPath, loaded: false, onLoad: []};
        this.loadedScripts[scriptPath] = loadedScript;
        const newScriptElm = document.createElement('script');
        newScriptElm.src = scriptPath;
        newScriptElm.addEventListener('load', () => {
            loadedScript.loaded = true;
            if(onLoaded)
                onLoaded();
            for(var i=0; i<loadedScript.onLoad.length; i++)
                loadedScript.onLoad[i]();
            loadedScript.onLoad = [];
            // console.info("Loaded ", scriptPath, newScriptElm);
        });
        // console.info("Loading ", scriptPath, newScriptElm);
        document.head.appendChild(newScriptElm);
        return newScriptElm;
    }
}
customElements.define('articleform-editor', HTMLArticleFormEditorElement);