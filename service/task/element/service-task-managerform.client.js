document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("service/task/element/service-task.css");
});


class HTMLTaskFormManagerElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            taskID: -1,
            message: "No tasks available",
            status: 0,
            taskData: []
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

        this.state.taskID = this.getAttribute('taskID');
        this.state.isActive = this.getAttribute('isActive') === 'true';
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
        xhr.open ("GET", `:task/${this.state.taskID}/:json?getAll=true`, true);
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

    getFormData(form) {
        const formData = {};
        new FormData(form).forEach((value, key) => formData[key] = value);
        return formData;
    }

    render() {
        console.log("STATE", this.state);
        this.innerHTML = this.state.taskData.htmlForm;
    }

}
customElements.define('taskform-manager', HTMLTaskFormManagerElement);