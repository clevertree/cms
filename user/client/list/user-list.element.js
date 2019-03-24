document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});


class HTMLUserFormBrowserElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            userList: [],
            status: null,
            message: null,
        };
        this.keyTimeout = null;
        // this.state = {id:-1, flags:[]};
    }

    setState(newState) {
        for(let i=0; i<arguments.length; i++)
            Object.assign(this.state, arguments[i]);
        this.renderResults();
    }

    connectedCallback() {
        this.addEventListener('keyup', this.onKeyUp);
        this.addEventListener('submit', this.onSubmit);
        this.render();
        this.onSubmit();
    }

    onSuccess(response) {
        // if(response.redirect)
        //     setTimeout(() => window.location.href = response.redirect, 2000);
    }
    onError(response) {
            console.error(response.message || 'Error: ', response);
        }

    onKeyUp(e) {
        switch(e.target.name) {
            case 'search':
                clearTimeout(this.keyTimeout);
                this.keyTimeout = setTimeout(e => this.onSubmit(), 500);
                break;
        }
    }


    onSubmit(e) {
        if(e) e.preventDefault();
        const form = this.querySelector('form');
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
        console.log("RENDER", this.state);
        let searchField = this.querySelector('input[name=search]');
        const selectionStart = searchField ? searchField.selectionStart : null;
        this.innerHTML =
            `<form action="/:user/:list" method="POST" class="user user-list themed">
                <table class="user themed">
                    <caption>Browse Users</caption>
                    <thead>
                        <tr>
                            <td colspan="5">
                                <input type="text" name="search" placeholder="Search Users" value="${this.state.search||''}"/>
                            </td>
                        </tr>
                        <tr><td colspan="5"><hr/></td></tr>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Profile</th>
                            <th>Flags</th>
                            <th>Password</th>
                        </tr>
                    </thead>
                    <tbody class="results">
                        <tr>
                            <th colspan="5">No Results</th>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td colspan="5"><hr/></td></tr>
                        <tr>
                            <td colspan="5" class="status">
                                <div class="message">User Browser</div> 
                            </td>
                        </tr>
                    </tfoot>
                </table>
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
        resultsElement.innerHTML = this.state.userList.map(user => `
            <tr class="results ${classOdd=classOdd===''?'odd':''}">
                <td><a href=":user/${user.id}">${user.id}</a></td>
                <td><a href=":user/${user.username}">${user.username}</a></td>
                <td><a href=":user/${user.id}/:profile" class="action-edit">&#x270D; edit</a></td>
                <td>${user.flags.join(', ')} <a href=":user/${user.id}/:flags" class="action-edit">&#x270D;</a></td>
                <td><a href=":user/${user.id}/:password" class="action-edit">&#x270D; change</a></td>
            </tr>
            `).join('');

        const statusElement = this.querySelector('td.status');
        statusElement.innerHTML = this.state.message
            ? this.state.message
            : `User Browser`;
    }
}

// HTMLUserFormBrowserElement.UserRow = class {
//     constructor(row) {
//         Object.assign(this, row);
//         if(this.profile)
//             this.profile = JSON.parse(this.profile);
//         if(this.flags)
//             this.flags = this.flags.split(',');
//     }
//
//     hasFlag(flag) { return this.flags && this.flags.indexOf(flag) !== -1; }
//     isAdmin() { return this.hasFlag('admin'); }
//     // isGuest() { return this.hasFlag('guest'); }
// };

customElements.define('user-list', HTMLUserFormBrowserElement);