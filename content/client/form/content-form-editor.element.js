document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":content/:client/form/content-form.css");
});


class HTMLContentEditorFormElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            message: "Editing content",
            status: 0,
            processing: false,
            mode: null,
            revisionID: null,
            editor: sessionStorage.getItem("content-form-editor:editor"),
            content: {id: -1},
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
        for(let i=0; i<arguments.length; i++)
           Object.assign(this.state, arguments[i]);
        this.render();
    }


    connectedCallback() {
        this.addEventListener('change', e => this.onChange(e));
        this.addEventListener('submit', e => this.onSubmit(e));
        this.addEventListener('keyup', e => this.onKeyUp(e));

        const contentID = this.getAttribute('id');
        if(contentID) {
            this.setState({content: {id: contentID}, mode: 'edit'});
        }
        const mode = this.getAttribute('mode');
        if(mode)
            this.setState({mode});
        if(!this.state.mode)
            console.error("No mode='' attribute set for editor ", this);
        this.render();
        this.requestFormData();
    }

    onSuccess(e, response) {
        console.log(response);
        if(response.redirect) {
            this.setState({processing: true});
            setTimeout(() => window.location.href = response.redirect, 1500);
        }
    }

    onError(e, response) {
        console.error(e, response);
    }

    onKeyUp(e) {
        const form = e.target.form || this.querySelector('form.content-form-editor');
        this.renderPreview(form.elements['data'].value);
        this.state.content.data = form.elements['data'].value;
    }

    onChange(e) {
        switch(e.target.name) {
            case 'revision':
                const revisionID = e.target.value;
                console.log("Load Revision: " + revisionID);
                // this.setState({revisionID});
                this.setState({revisionID});
                this.requestFormData();
                break;
            case 'editor':
                this.state.editor = e.target.value;
                sessionStorage.setItem("content-form-editor:editor",this.state.editor);
                this.renderWYSIWYGEditor();
                break;
            case 'title':
            case 'path':
            case 'theme':
            case 'parent_id':
                this.state.content[e.target.name] = e.target.value;
                break;
            case 'data':
                if(typeof html_beautify !== "undefined")
                    e.target.value = html_beautify(e.target.value);
                this.state.content[e.target.name] = e.target.value;
                this.renderPreview(e.target.value);
                break;
        }
        // TODO: warn user about unsaved data
    }


    requestFormData() {
        const form = this.querySelector('form');
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            this.setState({processing: false}, xhr.response);
        };
        xhr.responseType = 'json';
        let params = '?t=' + new Date().getTime();
        if(this.state.revisionID)
            params = `&r=${this.state.revisionID}`;
        xhr.open ('OPTIONS', form.getAttribute('action') + params, true);
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

    renderPreview(html) {
        const previewContent = document.querySelector('.content-preview-content');
        if(previewContent)
            previewContent.innerHTML = html;
    }

    render() {
        // const formData = this.getFormData();
        let action = `/:content/${this.state.content.id}/:edit`;
        let message = `Editing content ID ${this.state.content.id}`;
        if(this.state.message)
            message = this.state.message;

        console.log("RENDER", this.state);
        this.innerHTML =
            `<form action="${action}" method="POST" class="content content-form-editor themed">
            <input type="hidden" name="id" value="${this.state.content.id}" />
            <fieldset>
                <table class="content themed">
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
                    <tbody>
                        <tr>
                            <th style="width: 65px;"></th>
                            <th></th>
                        </tr>
                        <tr>
                            <td class="label">Title</td>
                            <td>
                                <input type="text" name="title" value="${this.state.content.title || ''}" required/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Path</td>
                            <td>
                                <input type="text" name="path" placeholder="/path/to/content/" value="${this.state.content.path || ''}" />
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
                            <td class="label">Content</td>
                            <td>
                                <textarea class="editor-plain editor-wysiwyg-target" name="data"
                                    >${this.state.content.data || ''}</textarea>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Switch Editor</td>
                            <td>
                                <label>
                                    <select name="editor">
                                    ${[
                ['', 'Plain Text / HTML'],
                ['summernote', 'SummerNote'],
                ['jodit', 'Jodit (Image Uploads)'],
                ['trumbowyg', 'Trumbowyg'],
                ['pell', 'Pell'],
                ['froala', 'Froala (Not free)'],
                ['quill', 'Quill (Broken)'],
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
                                    <option value="${revision.id}">${new Date(revision.created).toLocaleString()}</option>
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
                    </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td style="text-align: right;" colspan="2">
                                    <a href=":content/${this.state.content.id}">Back to content</a>
                                    <button type="submit" ${this.state.processing || !this.state.editable ? 'disabled="disabled"' : ''}>Publish</button>
                                </td>
                            </tr>
                        </tfoot>
                </table>
            </fieldset>
        </form>`;

        clearTimeout(this.renderEditorTimeout);
        this.renderEditorTimeout = setTimeout(e => this.renderWYSIWYGEditor(), 100);
    }

    renderWYSIWYGEditor() {
        if(this.state.content.data)
            this.renderPreview(this.state.content.data);

        // console.log("RENDER", this.state);
        switch(this.state.editor) {
            default:
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                this.removeWYSIWYGEditor = null;

                this.loadScripts([
                    'https://cdn.rawgit.com/beautify-web/js-beautify/v1.9.0-beta3/js/lib/beautify.js',
                    // 'https://cdn.rawgit.com/beautify-web/js-beautify/v1.9.0-beta3/js/lib/beautify-css.js',
                    'https://cdn.rawgit.com/beautify-web/js-beautify/v1.9.0-beta3/js/lib/beautify-html.js',
                ]);
                break;

            case 'pell':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                this.removeWYSIWYGEditor = null;

                this.loadScripts([
                    'https://www.cssscript.com/demo/minimalist-wysiwyg-editor-pell-js/dist/pell.js'
                    // 'node_modules/pell/dist/pell.min.js',
                ], () => {
                    const target = document.querySelector('.editor-wysiwyg-target');
                    const pellContainer = document.createElement('div');
                    target.parentNode.appendChild(pellContainer);
                    target.style.display = 'none';
                    // pellContainer.innerHTML = target.value;
                    // Initialize pell on an HTMLElement
                    pell.init({
                        // <HTMLElement>, required
                        element: pellContainer,
                        onChange: html => target.value = html,
                        defaultParagraphSeparator: 'div',
                        styleWithCSS: false,
                        classes: {
                            actionbar: 'pell-actionbar',
                            button: 'pell-button',
                            content: 'pell-content',
                            selected: 'pell-button-selected'
                        }
                    });
                    pellContainer.querySelector('.pell-content').innerHTML = target.value;


                    console.log("Loaded pell WYSIWYG Editor", pellContainer);
                    this.removeWYSIWYGEditor = () => {
                        pellContainer.parentNode.removeChild(pellContainer);
                        target.setAttribute('style', '');
                        // target.trumbowyg('destroy');
                        console.log("Unloaded pell WYSIWYG Editor", target);
                        ["pell.min.css"]
                            .forEach(sel => {
                                const cssLink = document.head.querySelector("link[href$='" + sel + "']");
                                if(cssLink) cssLink.parentNode.removeChild(cssLink);
                            });
                    };
                });

                [
                    'https://www.cssscript.com/demo/minimalist-wysiwyg-editor-pell-js/dist/pell.css'
                ].forEach(INCLUDE_CSS => {
                    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
                        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
                });

                break;

            case 'trumbowyg':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                this.removeWYSIWYGEditor = null;

                this.loadScripts([
                    'https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js',
                    'https://rawgit.com/RickStrahl/jquery-resizable/master/dist/jquery-resizable.min.js',

                    'https://rawcdn.githack.com/Alex-D/Trumbowyg/v2.12.0/dist/trumbowyg.min.js',
                    'https://rawcdn.githack.com/Alex-D/Trumbowyg/v2.12.0/dist/plugins/cleanpaste/trumbowyg.cleanpaste.min.js',
                    'https://rawcdn.githack.com/Alex-D/Trumbowyg/v2.12.0/dist/plugins/pasteimage/trumbowyg.pasteimage.min.js',
                    // 'node_modules/trumbowyg/dist/trumbowyg.min.js',
                    // 'node_modules/trumbowyg/dist/plugins/cleanpaste/trumbowyg.cleanpaste.min.js',
                    // 'node_modules/trumbowyg/dist/plugins/pasteimage/trumbowyg.pasteimage.min.js'
                ], () => {
                    const target = jQuery('.editor-wysiwyg-target');
                    target.trumbowyg();
                    console.log("Loaded Trumbowyg WYSIWYG Editor", target);
                    this.removeWYSIWYGEditor = () => {
                        const target = jQuery('.editor-wysiwyg-target');
                        target.trumbowyg('destroy');
                        console.log("Unloaded Trumbowyg WYSIWYG Editor", target);
                        ["trumbowyg.min.css"]
                            .forEach(sel => {
                                const cssLink = document.head.querySelector("link[href$='" + sel + "']");
                                if(cssLink) cssLink.parentNode.removeChild(cssLink);
                            });
                    };
                });

                [
                    'https://rawcdn.githack.com/Alex-D/Trumbowyg/v2.12.0/dist/ui/trumbowyg.min.css',
                    // 'node_modules/trumbowyg/dist/ui/trumbowyg.min.css'
                ].forEach(INCLUDE_CSS => {
                    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
                        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
                });

                break;

            case 'summernote':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                this.removeWYSIWYGEditor = null;

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

                        ["bootstrap.css", "summernote.css"].forEach(sel => {
                            const cssLink = document.head.querySelector("link[href$='" + sel + "']");
                            if(cssLink) cssLink.parentNode.removeChild(cssLink);
                        });
                    };
                });

                break;

            case 'quill':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                this.removeWYSIWYGEditor = null;

                [
                    'https://cdn.quilljs.com/1.3.6/quill.snow.css',
                ].forEach(INCLUDE_CSS => {
                    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
                        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
                });

                this.loadScripts([
                    'https://cdn.quilljs.com/1.3.6/quill.js'
                ], () => {
                    const target = document.querySelector('.editor-wysiwyg-target');
                    target.style.display = 'none';
                    const divContainer = document.createElement('div');
                    divContainer.classList.add('editor-wysiwyg-container');
                    divContainer.innerHTML = target.value;
                    target.parentNode.appendChild(divContainer);
                    var quill = new Quill('.editor-wysiwyg-container', {
                        theme: 'snow'
                    });
                    quill.on('editor-change', (eventName) => {
                        if (eventName === 'text-change') {
                            target.value = quill.container.firstChild.innerHTML;
                        }
                    });
                    console.log("Loaded Quill WYSIWYG Editor", quill);

                    this.removeWYSIWYGEditor = () => {
                        this.render();

                        ["quill.snow.css"].forEach(sel => {
                            const cssLink = document.head.querySelector("link[href$='" + sel + "']");
                            if(cssLink) cssLink.parentNode.removeChild(cssLink);
                        });
                    };
                });

                break;

            case 'jodit':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                this.removeWYSIWYGEditor = null;

                [
                    location.protocol + '//cdnjs.cloudflare.com/ajax/libs/jodit/3.1.39/jodit.min.css',
                    // 'node_modules/jodit/build/jodit.min.css',
                ].forEach(INCLUDE_CSS => {
                    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
                        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
                });

                this.loadScripts([
                    location.protocol + '//cdnjs.cloudflare.com/ajax/libs/jodit/3.1.39/jodit.min.js',
                    // 'node_modules/jodit/build/jodit.min.js',
                ], () => {
                    var editor = new Jodit('.editor-wysiwyg-target', {
                        enableDragAndDropFileToEditor: true,
                        filebrowser: {
                            ajax: {
                                url: ':file/:browse',
                                format: 'json',
                                process: function (resp) {
                                    resp = {
                                        success: resp.success,
                                        data: {
                                            // messages?: string[];
                                            sources: {
                                                'local': {
                                                    files: resp.files.map(fileEntry => { return {
                                                        file: fileEntry.path,
                                                        name: fileEntry.title || fileEntry.path
                                                        // thumb: string;
                                                        // thumbIsAbsolute?: boolean;
                                                        // changed: string;
                                                        // size: string;
                                                        // isImage: boolean;
                                                    }}),
                                                    folders: resp.folders,
                                                    path: resp.path,
                                                    baseurl: window.origin,
                                                }
                                            },
                                            // code: number;
                                            // path: string;
                                            // name: string;
                                            // source: string;
                                            permissions: null,
                                        }
                                    };
                                    console.log(resp);
                                    return resp;
                                },
                            },
                            prepareData: function (data) {
                                console.log(data);
                                return data;
                            },
                            error: function (e) {
                                console.error(e);
                                // this.events.fire('errorPopap', [e.getMessage(), 'error', 4000]);
                            }
                        },
                        uploader: {
                            url: ':file/:upload',
                            format: 'json',
                            pathVariableName: 'path',
                            filesVariableName: 'files',
                            // prepareData: function (data) {
                            //     for (var key of data.keys()) {
                            //         var field = data.get(key);
                            //         if(typeof field === "object") {
                            //             field.name = field.name
                            //                 .replace('.jpg.jpeg', '.jpeg')
                            //                 .replace('.jpeg.jpeg', '.jpeg')
                            //                 .replace('.gif.gif', '.gif')
                            //                 .replace('.png.png', '.png')
                            //         }
                            //     }
                            //     return data;
                            // },
                            isSuccess: function (resp) {
                                return !resp.error;
                            },
                            getMsg: function (resp) {
                                return resp.msg.join !== undefined ? resp.msg.join(' ') : resp.msg;
                            },
                            process: function (resp) {
                                resp = {
                                    files: resp[this.options.filesVariableName] || [],
                                    path: resp.path,
                                    baseurl: window.origin,
                                    error: resp.error,
                                    msg: resp.message
                                };
                                console.log(resp);
                                return resp;
                            },
                            error: function (e) {
                                console.error(e);
                                // this.events.fire('errorPopap', [e.getMessage(), 'error', 4000]);
                            },
                            defaultHandlerSuccess: function (data, resp) {
                                var i, field = this.options.uploader.filesVariableName;
                                if (data[field] && data[field].length) {
                                    for (i = 0; i < data[field].length; i += 1) {
                                        this.selection.insertImage(data.baseurl + data[field][i]);
                                    }
                                }
                            },
                            defaultHandlerError: function (resp) {
                                console.error(e);
                                this.events.fire('errorPopap', [this.options.uploader.getMsg(resp)]);
                            }
                        }
                    });
                    // editor.value = '<p>start</p>';
                    // console.log("Loaded Jodit WYSIWYG Editor", editor);

                    this.removeWYSIWYGEditor = () => {
                        // const target = jQuery('.editor-wysiwyg-target');
                        // target.summernote('destroy');
                        editor.destruct();
                        console.log("Unloaded Jodit WYSIWYG Editor", editor);

                        ["jodit.min.css"].forEach(sel => {
                            const cssLink = document.head.querySelector("link[href$='" + sel + "']");
                            if(cssLink) cssLink.parentNode.removeChild(cssLink);
                        });
                    };
                });

                break;

            case 'froala':
                if(this.removeWYSIWYGEditor)
                    this.removeWYSIWYGEditor();
                this.removeWYSIWYGEditor = null;

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
                        ["font-awesome.min.css", "froala_editor.pkgd.min.css", "froala_style.min.css"]
                            .forEach(sel => {
                                const cssLink = document.head.querySelector("link[href$='" + sel + "']");
                                if(cssLink) cssLink.parentNode.removeChild(cssLink);
                            });
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
customElements.define('content-form-editor', HTMLContentEditorFormElement);