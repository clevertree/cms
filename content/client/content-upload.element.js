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
            content: [null]
        };
    }

    setState(newState) {
        for(let i=0; i<arguments.length; i++)
           Object.assign(this.state, arguments[i]);
        this.render();
    }


    connectedCallback() {
        // this.addEventListener('change', e => this.onChange(e));
        // this.addEventListener('submit', e => this.onSubmit(e));

        this.render();
        this.requestFormData();
    }


    requestFormData() {
        const form = this.querySelector('form');
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            this.setState({processing: false}, xhr.response);
        };
        xhr.responseType = 'json';
        xhr.open ('OPTIONS', form.getAttribute('action'), true);
        xhr.send ();
        this.setState({processing: true});
    }

    // onSuccess(e, response) {
    //     if(response.redirect)
    //         setTimeout(() => window.location.href = response.redirect, 2000);
    // }
    // onError(e, response) {}
    //
    // onChange(e) {
    //     const form = e.target.form || e.target;
    //     console.log(this.getFormData());
    // }

    // onSubmit(e) {
    //     if(e) e.preventDefault();
    //     const form = e ? e.target : this.querySelector('form');
    //     const request = this.getFormData(form);
    //     const method = form.getAttribute('method');
    //     const action = form.getAttribute('action');
    //
    //     const xhr = new XMLHttpRequest();
    //     xhr.onload = (e) => {
    //         const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
    //         this.setState({status: xhr.status, processing: false}, response);
    //         if(xhr.status === 200) {
    //             this.onSuccess(e, response);
    //         } else {
    //             this.onError(e, response);
    //         }
    //     };
    //     xhr.open(method, action, true);
    //     xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    //     xhr.responseType = 'json';
    //     xhr.send(JSON.stringify(request));
    //     this.setState({processing: true});
    // }


    // getFormData(form) {
    //     form = form || this.querySelector('form');
    //     const formData = {};
    //     new FormData(form).forEach((value, key) => formData[key] = value);
    //     return formData;
    // }

    render() {
        // const formData = this.getFormData();


        // TODO: multiple file upload
        // console.log("RENDER", this.state);
        this.innerHTML =
            `
        <iframe name="content-uploadform-iframe" src="" style="display: none;"></iframe>
        <form action="/:content/:upload" target="content-uploadform-iframe" method="POST" class="content content-uploadform themed" enctype="multipart/form-data">
            <fieldset>
                <table class="content">
                    <tbody>
                        <tr>
                            <td colspan="3">
                                <input name="files" type="file" multiple/>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td colspan="3"><hr/></td></tr>
                        <tr>
                            <td colspan="3" style="text-align: right;">
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