document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("/:task/:client/task.css");
});


class HTMLTaskFormManagerElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            taskName: null,
            message: "Loading available taskClass...",
            status: 0,
            taskData: [],
            taskForms: {}
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

        const taskName = this.getAttribute('taskName');
        if(taskName)
            this.setState({taskName});
        this.requestFormData();
    }


    onSuccess(e, response) {
        if(response.result) {
            this.state.taskForms[response.result.taskName] = response.result.taskForm;
            this.render();
        }
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
        if(!this.state.user.profile)
            this.state.user.profile = {};
        if(e.target.name) // typeof this.state.user.profile[e.target.name] !== 'undefined')
            this.state.user.profile[e.target.name] = e.target.value;
    }

    onKeyUp(e) {
        // this.requestFormData(e);
        if(e.target.id === 'search') {
            this.state.search = e.target.value;
            this.renderResults();
        }
    }


    requestFormData() {
        // const form = this.querySelector('form');
        const action = '/:task' + (this.state.taskName ? '/' + this.state.taskName : '') + document.location.search;
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
            this.setState({processing: false, status: xhr.status}, response);
        };
        xhr.responseType = 'json';
        xhr.open ('OPTIONS', action, true);
        xhr.send ();
        this.setState({processing: true});
    }

    onSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const request = this.getFormData(form);

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
        xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.responseType = 'json';
        xhr.send(JSON.stringify(request));
        this.setState({processing: true});
    }

    getFormData(form=null) {
        form = form || this.querySelector('form');
        const formData = {};
        new FormData(form).forEach((value, key) => formData[key] = value);
        return formData;
    }

    render() {
        console.log("RENDER", this.state);
        let searchField = this.querySelector('input#search');
        const selectionStart = searchField ? searchField.selectionStart : null;
        this.innerHTML =
            `<form action="#" class="task task-editor themed">
                <fieldset>
                    <table class="task">
                        <thead>
                            <tr>
                                <td>
                                    <input type="text" id="search" placeholder="Search Tasks" value="${searchField ? searchField.value||'' : ''}"/>
                                </td>
                                <td class="status">
                                    <div class="message">Task Editor</div> 
                                </td>
                            </tr>
                        </thead>
                    </table>
                </fieldset>
            </form>
            <ul class="results"></ul>
`;
        searchField = this.querySelector('input#search');
        searchField.focus();
        if(selectionStart)
            searchField.selectionStart = selectionStart;
        this.renderResults();
    }

    renderResults() {
        const form = this.querySelector('form');
        // const formData = this.getFormData();
        const resultsElement = this.querySelector('ul.results');
        let classOdd = '';
        const search = form ? form.search.value : null;
        let resultHTML = '', resultCount = 0;
        for(let taskName in this.state.taskForms) {
            if(this.state.taskForms.hasOwnProperty(taskName)) {
                if(!search || taskName.indexOf(search) !== -1) {
                    resultHTML += `<li class="${classOdd=classOdd===''?'odd':''}">
                        ${this.state.taskForms[taskName]}
                    </li>`;
                    resultCount++;
                }
            }
        }

        resultsElement.innerHTML = resultHTML;


        const statusElement = this.querySelector('td.status');
        statusElement.innerHTML = `<div class="message">${resultCount} available task${resultCount===1?'':'s'} displayed</div>`;
    }

}
customElements.define('task-manager', HTMLTaskFormManagerElement);