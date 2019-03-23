document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":content/:client/form/content-form.css");
});


class HTMLContentFormUploadElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            message: "Upload new content",
            status: 0,
            processing: false,
            currentUploads: [],
            uploadPath: '/file/'
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
        this.addEventListener('iframe-loaded', e => this.onIFrameLoaded(e));

        this.render();
        this.requestFormData();
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

    onIFrameLoaded(e) {
        const div = document.createElement("div");
        div.innerHTML = e.target.contentDocument.body.innerHTML;
        const iframeContent = div.textContent || div.innerText || "";
//         console.log(e, e.target, iframeContent);
        if(!iframeContent)
            return;
        const iframeJSON = JSON.parse(iframeContent);
//         console.log("IFrame Response: ", iframeJSON || iframeContent);
        if(iframeJSON && iframeJSON.currentUploads) {
            this.setState(iframeJSON);
            this.dispatchEvent(new CustomEvent('/:content/:upload', {
                bubbles: true,
                detail: iframeJSON
            }))
        }
    }

    onSuccess(response) {
        console.log(response);
        if(response.redirect) {
            this.setState({processing: true});
            setTimeout(() => window.location.href = response.redirect, 2000);
        }
    }

    onError(response) {
            console.error(response.message || 'Error: ', response);
        }
    onChange(e) {
        switch(e.target.name) {
            case 'selectAll':
                const checkboxes = this.querySelectorAll('input[type=checkbox].delete');
                for(let i=0; i<checkboxes.length; i++)
                    checkboxes[i].checked = e.target.checked;

                break;
            case 'uploadPath':
                this.state.uploadPath = e.target.value;
                break;
        }
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


    render() {
        // const formUpload = this.querySelector('form.content-form-upload');
        const formManage = this.querySelector('form.content-form-upload-manage');
        const val = (name) => formManage && formManage.elements && formManage.elements[name] ? formManage.elements[name].value : '';


//         console.log("RENDER", this.state, formData);
        this.innerHTML =
            `
        <iframe name="content-form-upload-iframe" onload="this.dispatchEvent(new CustomEvent('iframe-loaded', {bubbles: true}))" style="display: none;"></iframe>
        <form action="/:content/:upload" target="content-form-upload-iframe" method="POST" class="content content-form-upload themed" enctype="multipart/form-data">
            <table class="content themed">
                <caption>Upload Temporary Files</caption>
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
                <tbody>
                    <tr>
                        <td>
                            <label>Upload:</label>
                        </td>
                        <td>
                            <input name="files" type="file" onchange="this.form.submit()" multiple required/>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label>Path:</label>
                        </td>
                        <td>
                            <input name="uploadPath" type="text" value="${this.state.uploadPath}" required/>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr><td colspan="2"><hr/></td></tr>
                    <tr>
                        <td colspan="2" style="text-align: right;">
                            <button type="submit" class="themed">Upload</button>
                        </td>
                    </tr>
                </tfoot>            
            </table>
        </form>
        <form action="/:content/:upload" method="POST" class="content content-form-upload-manage themed" enctype="application/x-www-form-urlencoded">
            <table class="content themed">
                <caption>Manage Uploaded Temporary Files</caption>
                <thead>
                    <tr><td colspan="3"><hr/></td></tr>
                    <tr style="text-align: left;">
                        <th>Uploaded File Name</th>
                        <th>Size</th>
                        <th>
                            <input type="checkbox" name="selectAll" value="1" />
                            Discard
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${this.state.currentUploads.map((currentUpload, i) => `
                    <tr>
                        <td style="max-width: 260px;">${currentUpload.uploadPath|| ''}</td>
                        <td>${this.readableByteSize(currentUpload.size)}</td>
                        <td>
                            <label>
                                <input type="checkbox" class="delete" name="delete[]" value="${i}" ${val(`delete[${i}]`) ? ' checked="checked"' : ''}/>
                            </label>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>  
                <tfoot>
                    <tr><td colspan="3"><hr/></td></tr>
                    <tr>
                        <td colspan="3" style="text-align: right;">
                            <button type="submit" class="themed">Discard Selected Files</button>
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
customElements.define('content-form-upload', HTMLContentFormUploadElement);