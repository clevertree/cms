document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":content/:client/content.css");
});


class HTMLContentFormUploadElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            message: "Upload new content",
            status: 0,
            processing: false,
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
        console.log("IFrame Response: ", iframeJSON || iframeContent);
        if(iframeJSON && iframeJSON.currentUploads) {
            this.setState(iframeJSON);
            this.dispatchEvent(new CustomEvent('/:content/:upload', {
                bubbles: true,
                detail: iframeJSON.currentUploads
            }))
        }
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
    onChange(e) {
        switch(e.target.name) {
            case 'selectAll':
                const checkboxes = this.querySelectorAll('input[type=checkbox].delete');
                for(let i=0; i<checkboxes.length; i++)
                    checkboxes[i].checked = e.target.checked;

                break;
        }
        const formData = this.getFormData();
        console.log(formData);
    }

    onSubmit(e) {
        const form = e ? e.target : this.querySelector('form');
        if(form.getAttribute('enctype') === 'multipart/form-data')
            return;
        if(e) e.preventDefault();
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
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.responseType = 'json';
        xhr.send(request);
        this.setState({processing: true});
    }


    getFormData(form) {
        form = form || this.querySelector('form');
        let queryString = '';
        new FormData(form).forEach((value, key) => queryString = queryString + (queryString ? '&' : '') + key + '=' + value);
        return queryString;
    }

    render() {
        const formData = this.getFormData();


        // TODO: multiple file upload
//         console.log("RENDER", this.state, formData);
        this.innerHTML =
            `
        <form action="/:content/:upload" method="POST" class="content content-uploadform-manage themed" enctype="application/x-www-form-urlencoded">
            <fieldset>
                <table class="content">
                    <thead>
                        <tr>
                            <div class="${this.state.status === 200 ? 'success' : (!this.state.status ? 'message' : 'error')} status-${this.state.status}">
                                ${this.state.message}
                            </div>
                        </tr>
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
                            <td style="max-width: 260px;">${currentUpload.name || ''}</td>
                            <td>${currentUpload.size || ''}</td>
                            <td>
                                <label>
                                    <input type="checkbox" class="delete" name="delete" value="${i}" ${formData[`delete[${i}]`] ? ' checked="checked"' : ''}/>
                                </label>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>  
                    <tfoot>
                        <tr><td colspan="3"><hr/></td></tr>
                        <tr>
                            <td colspan="3" style="text-align: center;">
                                <button type="submit">Discard Selected Files</button>
                            </td>
                        </tr>
                    </tfoot>      
                </table>
            </fieldset>
        </form>
        <iframe name="content-uploadform-iframe" onload="this.dispatchEvent(new CustomEvent('iframe-loaded', {bubbles: true}))" style="display: none;"></iframe>
        <form action="/:content/:upload" target="content-uploadform-iframe" method="POST" class="content content-uploadform themed" enctype="multipart/form-data">
            <fieldset>
                <table class="content">
                    <tbody>
                        <tr><td><hr/></td></tr>
                        <tr>
                            <td>
                                <input name="files" type="file" multiple/>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td><hr/></td></tr>
                        <tr>
                            <td style="text-align: right;">
                                <button type="submit">Upload</button>
                            </td>
                        </tr>
                    </tfoot>            
                </table>
            </fieldset>
        </form>`;
    }

}
customElements.define('content-uploadform', HTMLContentFormUploadElement);