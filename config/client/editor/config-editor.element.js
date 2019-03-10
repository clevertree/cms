document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":config/:client/editor/config-editor.css");
});


class HTMLConfigFormEditorElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            search: "",
            configList: [],
            status: 0,
            message: null,
            editable: false,
            processing: false,
        };
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

        this.state.userID = this.getAttribute('userID');
        this.render();
        this.requestFormData();
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
        // TODO: only send configs that have been changed
        console.log(this.state);
        this.checkSubmittable(e);
    }

    onKeyUp(e) {
        // this.requestFormData(e);
        if(e.target.id === 'search') {
            this.state.search = e.target.value;
            this.renderResults();
        }
        this.checkSubmittable(e);
    }

    checkSubmittable(e) {
        const form = this.querySelector('form');

        let disabled = true;
        const configChanges = {};
        for(let i=0; i<this.state.configList.length; i++) {
            const configItem = this.state.configList[i];
            const formElm = form && form.elements[configItem.name] ? form.elements[configItem.name] : null;
            if(formElm && (configItem.value||'') !== formElm.value) {
                // console.log(configItem.name, configItem.value, formData[configItem.name]);
                disabled = false;
                configChanges[configItem.name] = formElm.value;
            }
        }
        const btnSubmit = this.querySelector('button[type=submit]');
        if(disabled)    btnSubmit.setAttribute('disabled', 'disabled');
        else            btnSubmit.removeAttribute('disabled');
        return configChanges;
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


    render() {
        console.log("RENDER", this.state);
        let searchField = this.querySelector('input#search');
        const selectionStart = searchField ? searchField.selectionStart : null;
        this.innerHTML =
        `<form action="/:config/:edit" method="POST" class="config config-editor themed">
            <table class="config">
                <thead>
                    <tr>
                        <td colspan="4">
                            <input type="text" id="search" placeholder="Search Configs" value="${searchField ? searchField.value||'' : ''}"/>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="4" class="status">
                            <div class="message">Config Editor</div> 
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
                </tfoot>
            </table>
        </form>`;
        searchField = this.querySelector('input#search');
        searchField.focus();
        if(selectionStart)
            searchField.selectionStart = selectionStart;
        this.renderResults();
        this.checkSubmittable();
    }

    renderResults() {
        const form = this.querySelector('form');
        // const formData = this.getFormData();
        const resultsElement = this.querySelector('tbody.results');
        let classOdd = '';
        const search = form ? form.search.value : null;
        const results = this.state.configList
            .filter(config => !search || config.name.indexOf(search) !== -1)
        resultsElement.innerHTML = results
            .map(config => this.renderConfig(form, config, classOdd=classOdd===''?'odd':''))
            .join('');

        const statusElement = this.querySelector('td.status');
        statusElement.innerHTML = `<div class="message">${results.length} config setting${results.length===1?'':'s'} displayed</div>`;
    }

    renderConfig(form, config, trClass='') {
        let value = config.value;
        if(form && form.elements[config.name])
            value = form.elements[config.name].value;

        switch(config.type) {
            default:
            case 'text':
            case 'email':
            case 'checkbox':
            case 'password':
                return `
                <tr class="results ${trClass}">
                    <td><label>${config.name}:</label></td>
                    <td><input type='${config.type || 'text'}' name='${config.name}' value='${value||''}' /></td>
                </tr>`;

            case 'json':
            case 'textarea':
                return `
                <tr class="results ${trClass}">
                    <td><label>${config.name}:</label></td>
                    <td></td>
                </tr>
                <tr class="results ${trClass}">
                    <td colspan="2">
                            <textarea name='${config.name}'>${value||''}</textarea>
                        </label>
                    </td>
                </tr>`;
        }
    }
}
customElements.define('config-editor', HTMLConfigFormEditorElement);