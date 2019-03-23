document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":content/:client/form/content-form.css");
});


class HTMLContentFormAddElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            message: "Add new content",
            status: 0,
            processing: false,
            editable: false,
            content: [{}],
            currentUploads: [],
        };
    }

    setState(newState) {
        for(let i=0; i<arguments.length; i++)
           Object.assign(this.state, arguments[i]);
        this.render();
    }


    connectedCallback() {
        this.addEventListener('change', e => this.onChange(e));
        this.addEventListener('submit', e => this.onSubmit(e));
        document.addEventListener('/:content/:upload', e => this.onFileUpload(e));

        this.render();
        this.requestFormData();
    }

    onFileUpload(e) {
        this.setState(e.detail, {status: 200});
        console.log("FILE UPLOAD ", e.detail);
        if(!this.state.newUploads || this.state.newUploads.length === 0)
            return;
        const form = this.querySelector('form');
        let i=0;
        do {
            if (!form.elements[`content[${i}][title]`])
                break;

            const dataValue = form.elements[`content[${i}][dataSource]`].value;
            for(let j=0; j<this.state.newUploads.length; j++) {
                if('temp:' + this.state.newUploads[j].uploadPath === dataValue) {
                    this.state.newUploads.splice(j, 1);
                    break;
                }
            }
        }
        while(++i);

        const lastContent = this.state.content[this.state.content.length-1];
        if(!lastContent.title && !lastContent.path && !lastContent.dataSource)
            this.state.content.splice(this.state.content.length-1, 1);
        for(let j=0; j<this.state.newUploads.length; j++) {
            this.state.content.push({
                title: null,
                path: null,
                dataSource: 'temp:' + this.state.newUploads[j].uploadPath,
            });
        }
        this.state.newUploads = [];
        this.state.content.push({
            title: null,
            path: null,
            dataSource: null,
        });
        this.render();
        this.updateFormData();
    }

    onSuccess(response) {
        if(response.redirect)
            setTimeout(() => window.location.href = response.redirect, 2000);
    }
    onError(response) {
            console.error(response.message || 'Error: ', response);
        }

    onChange(e) {
        this.updateFormData();
    }
    updateFormData() {
        const form = this.querySelector('form');
        let i=0;
        do {
            if(!form.elements[`content[${i}][title]`])
                break;

            if(!this.state.content[i])
                this.state.content[i] = {};
            const content = this.state.content[i];
            content.title = form.elements[`content[${i}][title]`].value;
            content.path = form.elements[`content[${i}][path]`].value;
            content.dataSource = form.elements[`content[${i}][dataSource]`].value;
            if(content.dataSource && content.dataSource.startsWith('temp:')) {
                const uploadPath = content.dataSource.substr(5);
                if(!content.title) {
                    content.title = uploadPath.split('/').pop().split('.')[0]
                        .replace(/[_-]+/g, ' ').replace(/^([a-z])|\s+([a-z])/g, function ($1) {
                            return $1.toUpperCase();
                        });
                }
                if(!content.path) {
                    content.path = uploadPath;
                }
            }
            if(content.title && !content.path) {
                content.path = '/' + content.title
                    .replace(/\s+/g, '/')
                    .replace(/[^\w/]+/g, '')
                    .replace('//', '/')
                    .toLowerCase();
            }
            // TODO: autofill
            // const title =
        }
        while(++i);

        const lastContent = this.state.content[this.state.content.length-1];
        if(lastContent.title || lastContent.path)
            this.state.content.push({
                title: null,
                path: null,
                data: null,
            });
        // console.log(this.state.content);

        this.render();
    }


    onSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formValues = Array.prototype.filter
            .call(form ? form.elements : [], (input, i) => !!input.name && (input.type !== 'checkbox' || input.checked))
            .map((input, i) => input.name + '=' + encodeURIComponent(input.value))
            .join('&');
        const method = form.getAttribute('method');
        const action = form.getAttribute('action');

        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
            const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
            this.setState({processing: false, status: xhr.status}, response);
            if(xhr.status === 200) {
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

    requestFormData() {
        const form = this.querySelector('form');
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
            this.setState({processing: false, status: xhr.status}, response);
            this.updateFormData();
        };
        xhr.responseType = 'json';
        xhr.open ('OPTIONS', form.getAttribute('action'), true);
        xhr.send ();
        this.setState({processing: true});
    }

    render() {

        // console.log("RENDER", this.state);
        this.innerHTML =
            `<form action="/:content/:add" method="POST" class="content content-form-add themed">
                <table class="content themed">
                    <caption>Add New Content</caption>
                    <thead>
                        <tr>
                            <td colspan="3">
                                <div class="${this.state.status === 200 ? 'success' : (!this.state.status ? 'message' : 'error')} status-${this.state.status}">
                                    ${this.state.message}
                                </div>
                            </td>
                        </tr>
                        <tr><td colspan="3"><hr/></td></tr>
                        <tr>
                            <th>Title</th>
                            <th>Path</th>
                            <th>Content</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.state.content.map((content, i) => `
                        <tr>
                            <td>
                                <input type="text" name="content[${i}][title]" placeholder="New Content Title" value="${content.title||''}"/>
                            </td>
                            <td>
                                <input type="text" name="content[${i}][path]" placeholder="/new/content/path" value="${content.path||''}"/>
                            </td>
                            <td>
                                <select name="content[${i}][dataSource]" style="max-width: 140px;">
                                    <option value="">Empty (Default)</option>
                                    <optgroup label="Uploaded Files">
                                    ${this.state.currentUploads.map((upload, i) => 
                                        `<option value="temp:${upload.uploadPath}"${
                                            content.dataSource === `temp:${upload.uploadPath}` ? ' selected="selected"' : ''
                                            }>${upload.uploadPath.split('/').pop()} (${this.readableByteSize(upload.size)})</option>`
                                    )}
                                    </optgroup>
                                    <optgroup label="Existing Content">
                                    
                                    </optgroup>
                                </select>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr><td colspan="3"><hr/></td></tr>
                        <tr>
                            <td colspan="3" style="text-align: right;">
                                <button type="submit" class="themed" ${this.state.processing || !this.state.editable ? 'disabled="disabled"' : ''}>
                                    Add New Page${this.state.content.length > 0 ? 's' : ''}
                                </button>
                            </td>
                        </tr>
                    </tfoot>            
                </table>
            </form>`;
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
}
customElements.define('content-form-add', HTMLContentFormAddElement);