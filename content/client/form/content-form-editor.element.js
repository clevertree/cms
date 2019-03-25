document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":content/:client/form/content-form.css");
});

{
    let iframeRenderTimeout = null;
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
                contentString: null,
                revision: {},
                history: [],
                // parentList: [],
                currentUploads: [] // TODO: finish
            };
            this.renderEditorTimeout = null;
            this.removeWYSIWYGEditor = null;
            this.loadedScripts = {};

            // this.state = {id:-1, flags:[]};
        }

        setState(newState) {
            for (let i = 0; i < arguments.length; i++)
                Object.assign(this.state, arguments[i]);
            this.render();
        }


        connectedCallback() {
            this.addEventListener('change', e => this.onChange(e));
            this.addEventListener('submit', e => this.onSubmit(e));
            this.addEventListener('keyup', e => this.onKeyUp(e));
            window.addEventListener('beforeunload', e => this.onBeforeUnload(e));

            const contentID = this.getAttribute('id');
            if (contentID) {
                this.setState({content: {id: contentID}, mode: 'edit'});
            }
            const mode = this.getAttribute('mode');
            if (mode)
                this.setState({mode});
            if (!this.state.mode)
                console.error("No mode='' attribute set for editor ", this);
            this.render();
            this.requestFormData();
        }

        onSuccess(response) {
            console.log(response);
            if (response.redirect) {
                this.setState({processing: true});
                setTimeout(() => window.location.href = response.redirect, 1500);
            }
        }

        onError(response) {
            console.error(response.message || 'Error: ', response);
        }

        onKeyUp(e) {
            const form = e.target.form || this.querySelector('form.content-form-editor');
            this.renderPreview(form.elements['data'].value);
            this.state.content.data = form.elements['data'].value;
        }

        onChange(e) {
            switch (e.target.name) {
                case 'revisionID':
                    const revisionID = parseInt(e.target.value);
                    console.log("Load Revision: " + revisionID);
                    this.setState({revisionID});
                    // this.state.revisionID = revisionID;
                    this.requestFormData();
                    break;
                case 'editor':
                    this.state.editor = e.target.value;
                    sessionStorage.setItem("content-form-editor:editor", this.state.editor);
                    this.renderWYSIWYGEditor();
                    break;
                case 'title':
                case 'path':
                case 'theme':
                case 'parent_id':
                    this.state.content[e.target.name] = e.target.value;
                    break;
                case 'data':
                    if (typeof html_beautify !== "undefined")
                        e.target.value = html_beautify(e.target.value);
                    this.state.content[e.target.name] = e.target.value;
                    this.renderPreview(e.target.value);
                    break;
                case 'dataSource':
                    break;
                case 'dataSourceFile':
                    if(!e.target.files || e.target.files.length === 0)
                        return;

                    const reader = new FileReader();

                    if(this.state.isBinary) {
                        reader.onloadend = (e) => {
                            if(!e.target.result)
                                throw new Error("Invalid upload data");

                            const base64String = this.uint8ToBase64(e.target.result);
                            Object.assign(this.state.content, {data: base64String, length: e.target.result.byteLength});
                            this.setState({encoding: 'base64'});
                            console.log("Uploaded Binary: ", this.readableByteSize(base64String.length));
                            e.target.value = "";
                        };
                        // If mime is editable, read as text, otherwise upload as binary
                        reader.readAsArrayBuffer(e.target.files[0]);

                    } else {

                        reader.onloadend = (e) => {
                            if(!e.target.result)
                                throw new Error("Invalid upload data");
                            console.log("Uploaded Text: ", this.readableByteSize(e.target.result.length));
                            Object.assign(this.state.content, {data: e.target.result});
                            this.setState({encoding: 'UTF8'});
                            e.target.value = "";
                        };
                        // If mime is editable, read as text, otherwise upload as binary
                        reader.readAsText(e.target.files[0]);

                    }
                    break;
            }
        }

        onBeforeUnload(e) {
            if(this.state.contentString && (this.state.contentString !== JSON.stringify(this.state.content))) {
                e = e || window.event;
                e.returnValue = "Unpublished changes will be lost";
                return e.returnValue;
            }

        }

        uint8ToBase64(buffer) {
            var binary = '';
            var bytes = new Uint8Array( buffer );
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode( bytes[ i ] );
            }
            return window.btoa( binary );
        }

        requestFormData() {
            const form = this.querySelector('form');
            const action = form.getAttribute('action');
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                response.status = xhr.status;
                if(response.contentRevision) {
                    if(response.contentRevision.data)
                        response.content.data = response.contentRevision.data;
                    response.content.length = response.contentRevision.length;
                }
                response.contentString = JSON.stringify(response.content);
                this.setState({processing: false}, response);
            };
            xhr.responseType = 'json';
            let params = '?t=' + new Date().getTime();
            if (this.state.revisionID)
                params += `&r=${this.state.revisionID}`;
            xhr.open('OPTIONS', action + params, true);
            xhr.send();
            this.setState({processing: true});
        }


        onSubmit(e) {
            this.state.contentString = JSON.stringify(this.state.content);
            
            e.preventDefault();
            const form = e.target;
            const formValues = Array.prototype.filter
                .call(form ? form.elements : [], (input, i) => !!input.name && !input.disabled && (input.type !== 'checkbox' || input.checked))
                .map((input, i) => input.name + '=' + encodeURIComponent(input.value))
                .join('&');
            const method = form.getAttribute('method');
            const action = form.getAttribute('action');

            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                response.status = xhr.status;
                this.setState({processing: false}, response);
                if (xhr.status === 200) {
                    this.onSuccess(response);
                } else {
                    this.onError(response);
                }
            };
            xhr.open(method, action, true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.responseType = 'json';
            xhr.send(formValues);
            this.setState({processing: true});
        }

        renderPreview(data) {

            clearTimeout(iframeRenderTimeout);
            iframeRenderTimeout = setTimeout(() => {
                const previewContent = document.querySelector('.content-preview-iframe');
                if(this.state.isBinary) {
                    previewContent.contentWindow.document.body.innerHTML
                        = `<img src='data:image/png;base64,${data}' />`;
                } else {

                    try {
                        const doc = new DOMParser().parseFromString(data, "text/xml");

                        switch (doc.firstChild.nodeName) {
                            case 'html':
                                previewContent.contentWindow.document.body.innerHTML = doc.body.innerHTML;
                                break;
                            case 'body':
                                previewContent.contentWindow.document.body.innerHTML = doc.body.innerHTML;
                                break;
                            default:
                                previewContent.contentWindow.document.body.innerHTML = data;
                        }
                    } catch (e) {
                        console.warn(e.message);

                        previewContent.contentWindow.document.body.innerHTML = data;
                    }
                }
            }, 300);
            // previewContent.src = previewContent.src.split("?")[0] + '?t=' + new Date().getTime();
        }

        render() {
            // const formData = this.getFormData();
            let action = `/:content/${this.state.content.id}/:edit`;
            let message = `Editing content ID ${this.state.content.id}`;
            if (this.state.message)
                message = this.state.message;

            console.log("RENDER", this.state);
            this.innerHTML =
                `<form action="${action}" method="POST" class="content content-form-editor themed">
            <input type="hidden" name="id" value="${this.state.content.id}" />
            <input type="hidden" name="encoding" value="${this.state.encoding}" />
            <table class="content themed">
                <caption>Editing content ID ${this.state.content.id}</caption>
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
                        <td style="width:10%;"><label for="title">Title:</label></td>
                        <td>
                            <input type="text" name="title" id="title" value="${this.state.content.title || ''}" required/>
                        </td>
                    </tr>
                    <tr>
                        <td><label for="path">Path:</label></td>
                        <td>
                            <input type="text" name="path" id="path" placeholder="/path/to/content/" value="${this.state.content.path || ''}" />
                        </td>
                    </tr>
                    <tr>
                        <td><label for="data">Content:</label></td>
                        <td class="content-form-editor-fullscreen-top">
                            ${this.state.isBinary ? `
                            <input type="hidden" name="data" id="data" />
                            <textarea class="editor-binary editor-wysiwyg-target" disabled>[Binary File]
Mime Type: ${this.state.mimeType || ''}
Length: ${this.readableByteSize(this.state.content.length)}
</textarea>
                            ` : `
                            <textarea class="editor-plain editor-wysiwyg-target" name="data" id="data"></textarea>
                            `}
                            <button type="button" class="content-form-editor-toggle-fullscreen" onclick="this.form.parentNode.classList.toggle('fullscreen')">Full Screen</button>
                        </td>
                    </tr>
                    <tr>
                        <td><label for="data">Upload:</label></td>
                        <td>
                            <input type="file" name="dataSourceFile"/>
                            ${false ? `
                                <select name="dataSource">
                                <option value="">Use Uploaded File</option>
                                ${this.state.currentUploads.map((upload, i) => `
                                    <option value="temp:${upload.uploadPath}">${upload.uploadPath} (${this.readableByteSize(upload.size)})</option>
                                `).join('')}
                                </select>
                            ` : ``}
                        </td>
                    </tr>
                    <tr>
                        <td><label for="editor">Editor:</label></td>
                        <td>
                            <select name="editor" id="editor">
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
                        </td>
                    </tr>
                    <tr>
                        <td><label for="revisionID">Revision:</label></td>
                        <td>
                            <select name="revisionID" id="revisionID">
                                <option value="">Load a revision</option>
                            ${this.state.history.map(revision => `
                                <option value="${revision.id}" ${revision.id === this.state.revisionID ? ' selected' : ''}>${new Date(revision.created).toLocaleString()}</option>
                            `)}
                            </select>
                        </td>
                    </tr>
                    ${false ? `<tr>
                        <td><label for="action">Preview:</label></td>
                        <td>
                            <select name="action" id="action">
                                <option value="publish">Publish Now (No Preview)</option>
                                <option value="draft">Save as Unpublished Draft</option>
                            </select>
                        </td>
                    </tr>` : ``}
                </tbody>
                <tfoot>
                    <tr><td colspan="2"><hr/></td></tr>
                    <tr>
                        <td style="text-align: right;" colspan="2">
                            <a href=":content/${this.state.content.id}">Back to content</a>
                            <button type="submit" class="themed" ${this.state.processing || !this.state.editable ? 'disabled="disabled"' : ''}>
                                Publish
                            </button>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </form>
            
        <section>
            <h1 style="text-align: center;">Preview</h1>
        </section>

        <iframe ${this.state.content.path ? `src="${this.state.content.path}"` : ''} class="content-preview-iframe content-form-editor-fullscreen-bottom"></iframe>


`;
            Array.prototype.filter
                .call(this.querySelector('form').elements , (input, i) => !!input.name && !input.disabled && (input.type !== 'checkbox' || input.checked))
                .forEach((input, i) => {
                    if(this.state.content[input.name])
                        input.value = this.state.content[input.name]
                });

            clearTimeout(this.renderEditorTimeout);
            this.renderEditorTimeout = setTimeout(e => this.renderWYSIWYGEditor(), 100);
        }

        // TODO: load script
        renderWYSIWYGEditor() {
            if (this.state.content.data)
                this.renderPreview(this.state.content.data);

            // console.log("RENDER", this.state);
            switch (this.state.editor) {
                default:
                    if (this.removeWYSIWYGEditor)
                        this.removeWYSIWYGEditor();
                    this.removeWYSIWYGEditor = null;

                    this.loadScripts([
                        'https://cdn.rawgit.com/beautify-web/js-beautify/v1.9.0-beta3/js/lib/beautify.js',
                        // 'https://cdn.rawgit.com/beautify-web/js-beautify/v1.9.0-beta3/js/lib/beautify-css.js',
                        'https://cdn.rawgit.com/beautify-web/js-beautify/v1.9.0-beta3/js/lib/beautify-html.js',
                    ]);
                    break;

                case 'pell':
                    if (this.removeWYSIWYGEditor)
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
                                    if (cssLink) cssLink.parentNode.removeChild(cssLink);
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
                    if (this.removeWYSIWYGEditor)
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
                                    if (cssLink) cssLink.parentNode.removeChild(cssLink);
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
                    if (this.removeWYSIWYGEditor)
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
                                if (cssLink) cssLink.parentNode.removeChild(cssLink);
                            });
                        };
                    });

                    break;

                case 'quill':
                    if (this.removeWYSIWYGEditor)
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
                                if (cssLink) cssLink.parentNode.removeChild(cssLink);
                            });
                        };
                    });

                    break;

                case 'jodit':
                    if (this.removeWYSIWYGEditor)
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
                                                        files: resp.files.map(fileEntry => {
                                                            return {
                                                                file: fileEntry.path,
                                                                name: fileEntry.title || fileEntry.path
                                                                // thumb: string;
                                                                // thumbIsAbsolute?: boolean;
                                                                // changed: string;
                                                                // size: string;
                                                                // isImage: boolean;
                                                            }
                                                        }),
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
                                if (cssLink) cssLink.parentNode.removeChild(cssLink);
                            });
                        };
                    });

                    break;

                case 'froala':
                    if (this.removeWYSIWYGEditor)
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
                                    if (cssLink) cssLink.parentNode.removeChild(cssLink);
                                });
                        };
                    });


                    break;
            }
        }


        readableByteSize(bytes) {
            if(Math.abs(bytes) < 1024)
                return bytes + ' B';
            const units = ['kB','MB','GB','TB','PB','EB','ZB','YB'];
            let u = -1;
            do { bytes /= 1024; ++u; }
            while(Math.abs(bytes) >= 1024 && u < units.length - 1);
            return bytes.toFixed(1)+' '+units[u];
        }


        loadScripts(scriptPaths, onLoaded) {
            if (scriptPaths.length === 0)
                return onLoaded && onLoaded();
            const scriptPath = scriptPaths.shift();
            this.loadScript(scriptPath, () => {
                this.loadScripts(scriptPaths, onLoaded);
            });
        }

        loadScript(scriptPath, onLoaded) {
            if (typeof this.loadedScripts[scriptPath] !== "undefined") {
                if (!onLoaded)
                    return;
                if (this.loadedScripts[scriptPath].loaded === true) {
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
                if (onLoaded)
                    onLoaded();
                for (var i = 0; i < loadedScript.onLoad.length; i++)
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

}