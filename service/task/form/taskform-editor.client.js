document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("service/task/form/taskform.css");
});


class HTMLTaskFormEditorElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            taskList: [],
            status: null,
            message: null,
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

        this.render();
        this.requestFormData();
    }


    onSuccess(e, response) {
        console.log(e, response);
        if(response.redirect) {
            this.setState({processing: true});
            setTimeout(() => window.location.href = response.redirect, 3000);
        }
    }

    onError(e, response) {
        console.error(e, response);
    }

    onChange(e) {
    }


    requestFormData() {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            this.setState({processing: false}, xhr.response);
        };
        xhr.responseType = 'json';
        xhr.open ("GET", `:task/:json?getAll=true`, true);
        // xhr.setRequestHeader("Accept", "application/json");
        xhr.send ();
        this.setState({processing: true});
    }

    onSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const request = this.getFormData(form);
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
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.responseType = 'json';
        xhr.send(JSON.stringify(request));
        this.setState({processing: true});
    }

    render() {
        const form = this.querySelector('form');
        console.log("STATE", this.state);
        let searchField = this.querySelector('input[name=search]');
        const selectionStart = searchField ? searchField.selectionStart : null;
        this.innerHTML =
        `<form action="/:task/:edit" method="POST" class="taskform taskform-editor themed">
            <fieldset ${this.state.processing ? 'disabled="disabled"' : null}>
                <table>
                    <thead>
                        <tr>
                            <td colspan="4">
                                <input type="text" name="search" placeholder="Search Tasks" value="${form ? form.search.value||'' : ''}"/>
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
                                <button type="submit" disabled>Update Task</button>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4" class="status">
                                <div class="message">Task Editor</div> 
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
        // this.checkSubmittable();
    }

    renderResults() {
        const form = this.querySelector('form');
        // const formData = this.getFormData();
        const resultsElement = this.querySelector('tbody.results');
        let classOdd = '';
        const search = form ? form.search.value : null;
        resultsElement.innerHTML = this.state.taskList
            .filter(task => !search || task.name.indexOf(search) !== -1)
            .map(task => `
            <tr class="results ${classOdd=classOdd===''?'odd':''}">
                <td>${task.name}</td>
                <td>${this.renderTask(task, form && form.elements[task.name] ? form.elements[task.name].value : null)}</td>
            </tr>
            `).join('');

        const statusElement = this.querySelector('td.status');
        statusElement.innerHTML =
            `<div class="${this.state.status === 200 ? 'success' : (!this.state.status? 'message' : 'error')} status-${this.state.status}">${this.state.message}</div>`;
    }

    renderTask(task, value=null) {
        if(value === null)
            value = task.value;
        switch(task.type) {
            default:
                return `<input type='text' name='${task.name}' value='${value||''}' />`;
            case 'text':
            case 'email':
            case 'checkbox':
            case 'password':
                return `<input type='${task.type}' name='${task.name}' value='${value||''}' />`;
            case 'textarea':
                return `<textarea name='${task.name}'>${value||''}</textarea>`;
        }
    }
}
customElements.define('taskform-editor', HTMLTaskFormEditorElement);