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
            message: "No tasks available",
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

        const taskName = this.getAttribute('taskName');
        if(taskName)
            this.setState({taskName});
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
        if(!this.state.user.profile)
            this.state.user.profile = {};
        if(e.target.name) // typeof this.state.user.profile[e.target.name] !== 'undefined')
            this.state.user.profile[e.target.name] = e.target.value;
    }

    requestFormData() {
        // const form = this.querySelector('form');
        const action = '/:task' + (this.state.taskName ? '/' + this.state.taskName : '');
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            this.setState({processing: false}, xhr.response);
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
        console.log("STATE", this.state);
        this.innerHTML = Object.values(this.state.taskForms).join('');
    }

}
customElements.define('task-managerform', HTMLTaskFormManagerElement);