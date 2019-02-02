document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("config/form/configform.css");
});


class HTMLConfigFormEditorElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            configs: [],
            status: null,
            message: null,
        };
        this.keyTimeout = null;
        // this.state = {id:-1, flags:[]};
    }

    setState(newState) {
        Object.assign(this.state, newState);
        // this.render();
        this.renderResults();
    }

    connectedCallback() {
        this.addEventListener('keyup', this.onEvent);
        this.addEventListener('submit', this.onEvent);
        this.render();
        this.submit();
    }

    onSuccess(e, response) {
        // if(response.redirect)
        //     setTimeout(() => window.location.href = response.redirect, 3000);
    }
    onError(e, response) {}

    onEvent(e) {
        switch (event.type) {
            case 'submit':
                this.submit(e);
                break;

            case 'keyup':
                switch(e.target.name) {
                    case 'search':
                        clearTimeout(this.keyTimeout);
                        this.keyTimeout = setTimeout(e => this.submit(), 500);
                        break;
                }
                break;
        }
    }

    // requestFormData() {
    //     const xhr = new XMLHttpRequest();
    //     xhr.onload = () => {
    //         this.setState({processing: false});
    //         // console.info(xhr.response);
    //         if(!xhr.response || !xhr.response.config)
    //             throw new Error("Invalid Response");
    //         this.setState(xhr.response);
    //         // this.state = xhr.response.user;
    //         // this.render();
    //     };
    //     xhr.responseType = 'json';
    //     xhr.open ("GET", `:config/${this.state.config.id}/:json?getAll=true&getRevision=${new Date(this.state.revisionDate).getTime()}`, true);
    //     // xhr.setRequestHeader("Accept", "application/json");
    //     xhr.send ();
    //     this.setState({processing: true});
    // }

    submit(e) {
        if(e)
            e.preventDefault();
        const form = this.querySelector('form');
        this.setState({processing: true});
        const formData = this.getFormData();

        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
            this.setState({processing: false});
            // console.log(e, xhr.response);
            const response = xhr.response && typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
            response.status = xhr.status;
            if(xhr.status === 200) {
                this.onSuccess(e, response);
            } else {
                this.onError(e, response);
            }
            this.setState(response);
        };
        xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        // xhr.setRequestHeader("Accept", "application/json");
        xhr.responseType = 'json';
        xhr.send(JSON.stringify(formData));
        this.setState({processing: true});
    }

    getFormData() {
        const form = this.querySelector('form');
        const formData = {};
        if(form) {
            new FormData(form).forEach(function (value, key) {
                formData[key] = value;
            });
        }
        return formData;
    }

    render() {
        const formData = this.getFormData();
        console.log("RENDER", this.state);
        let searchField = this.querySelector('input[name=search]');
        const selectionStart = searchField ? searchField.selectionStart : null;
        this.innerHTML =
            `<form action="/:config/:list" method="POST" class="configform configform-editor themed">
            <fieldset>
                <table>
                    <thead>
                        <tr>
                            <td colspan="4">
                                <input type="text" name="search" placeholder="Search Configs" value="${formData.search||''}"/>
                            </td>
                        </tr>
                        <tr><td colspan="4"><hr/></td></tr>
                        <tr>
                            <th>Name</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody class="results">
                        <tr>
                            <th colspan="4">No Results</th>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td colspan="2"><hr/></td></tr>
                        <tr>
                            <td colspan="2" style="text-align: right;">
                                <button type="submit" disabled>Update Config</button>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4" class="status">
                                <div class="message">Config Editor</div> 
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </fieldset>
        </form>`;
        searchField = this.querySelector('input[name=search]');
        searchField.focus();
        if(selectionStart)
            searchField.selectionStart = selectionStart;
        this.renderResults();
    }

    renderResults() {
        const resultsElement = this.querySelector('tbody.results');
        let classOdd = '';
        resultsElement.innerHTML = this.state.configs.map(config => `
            <tr class="results ${classOdd=classOdd===''?'odd':''}">
                <td>${config.name}</td>
                <td>${this.renderConfig(config)}</td>
            </tr>
            `).join('');

        const statusElement = this.querySelector('td.status');
        statusElement.innerHTML = this.state.message
            ? `<div class="${this.state.status === 200 ? 'message' : 'error'}">${this.state.message}</div>`
            : `<div class="message">Config Editor</div>`;
    }

    renderConfig(config) {
        switch(config.type) {
            default:
                return `<input type='text' name='${config.name}' value='${config.value}' />`;
        }
    }
}
customElements.define('configform-editor', HTMLConfigFormEditorElement);