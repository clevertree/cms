document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":content/:client/content.css");
});


class HTMLContentFormAddElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            message: "Add new content",
            status: 0,
            processing: false,
            content: [null],
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
        this.setState({currentUploads: e.detail})
    }

    onSuccess(e, response) {
        if(response.redirect)
            setTimeout(() => window.location.href = response.redirect, 2000);
    }
    onError(e, response) {}

    onChange(e) {
        this.updateFormData();
    }
    updateFormData() {
        const formData = this.getFormData();
        let i=0;
        do {
            // TODO: autofill
            // const title =
        }
        while(++i);
        console.log(this.getFormData());
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
        xhr.send(JSON.stringify(request));
        this.setState({processing: true});
    }

    requestFormData() {
        const form = this.querySelector('form');
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
            this.setState({processing: false}, response);
        };
        xhr.responseType = 'json';
        xhr.open ('OPTIONS', form.getAttribute('action'), true);
        xhr.send ();
        this.setState({processing: true});
    }

    getFormData(form) {
        form = form || this.querySelector('form');
        const formData = {};
        new FormData(form).forEach((value, key) => formData[key] = value);
        return formData;
    }

    render() {
        const formData = this.getFormData();

        console.log("RENDER", this.state);
        this.innerHTML =
            `<form action="/:content/:add" method="POST" class="content content-addform themed">
            <fieldset>
                <table class="content">
                    <thead>
                        <tr>
                            <div class="${this.state.status === 200 ? 'success' : (!this.state.status ? 'message' : 'error')} status-${this.state.status}">
                                ${this.state.message}
                            </div>
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
                                <input type="text" name="content[${i}][title]" placeholder="New Content Title" value="${formData[`content[${i}][title]`] || ''}" required/>
                            </td>
                            <td>
                                <input type="text" name="content[${i}][path]" placeholder="/new/content/path" value="${formData[`content[${i}][path]`] || ''}" required/>
                            </td>
                            <td>
                                <select name="content[${i}][data]" style="max-width: 140px;">
                                    <option value="">Empty (Default)</option>
                                    <optgroup label="Uploaded Files">
                                    ${this.state.currentUploads.map((upload, i) => 
                                        `<option value="uploaded:${upload.name}"${
                                            formData[`content[${i}][data]`] === `uploaded:${upload.name}` ? ' selected="selected"' : ''
                                            }>${upload.name} (${this.readableByteSize(upload.size)})</option>`
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
                                <button type="submit">Add New Page${this.state.content.length > 0 ? 's' : ''}</button>
                            </td>
                        </tr>
                    </tfoot>            
                </table>
            </fieldset>
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
customElements.define('content-addform', HTMLContentFormAddElement);