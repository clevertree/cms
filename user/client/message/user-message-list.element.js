document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserMessageListElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                messageList: []
            };
        }
        get action() { return `/:user/:message/:list`; }

        setState(newState) {
            for(let i=0; i<arguments.length; i++)
                Object.assign(this.state, arguments[i]);
            this.render();
        }

        connectedCallback() {
            this.addEventListener('change', e => this.onChange(e));
            this.addEventListener('submit', e => this.onSubmit(e));

            const messageID = this.getAttribute('messageID');
            if(messageID)
                this.setState({id: messageID});

            this.render();
            this.requestFormData();
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
            if(e.target.name && typeof this.state[e.target.name] !== 'undefined') // typeof this.state.user.profile[e.target.name] !== 'undefined')
                this.state[e.target.name] = e.target.value;
            // console.log(this.state);
        }

        requestFormData() {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                this.setState({processing: false}, response);
            };
            xhr.responseType = 'json';
            xhr.open ('OPTIONS', this.action, true);
            xhr.send ();
            this.setState({processing: true});
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
                const response = typeof xhr.response === 'object' ? xhr.response || {message: "No Response"} : {message: xhr.response};
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
            // TODO: display thread? display all messages?
            console.log("STATE", this.state);
            let searchField = this.querySelector('input[name=search]');
            const selectionStart = searchField ? searchField.selectionStart : null;
            this.innerHTML =
                `
                <form action="${this.action}" method="POST" class="user user-message themed">
                    <table class="user themed">
                        <caption>Messages</caption>
                        <thead>
                            <tr>
                                <td colspan="5">
                                    <input type="text" name="search" placeholder="Search Users" value="${this.state.search||''}"/>
                                </td>
                            </tr>
                            <tr><td colspan="5"><hr/></td></tr>
                            <tr>
                                <th>ID</th>
                                <th>From</th>
                                <th>Subject</th>
                                <th>Date</th>
                                <th>Action</th>
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
                                    <div class="message">Message Browser</div> 
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
            resultsElement.innerHTML = this.state.messageList.map(message => `
            <tr class="results ${classOdd=classOdd===''?'odd':''}">
                <td><a href=":user/:message/${message.id}">${message.id}</a></td>
                <td><a href=":user/${message.from}">${message.from}</a></td>
                <td><a href=":user/:message/${message.id}">${message.subject}</a></td>
                <td>${new Date(message.created).toLocaleString("en-US")}</td>
                <td></td>
            </tr>
            `).join('');

            const statusElement = this.querySelector('td.status');
            statusElement.innerHTML = this.state.message
                ? this.state.message
                : `Message Browser`;
        }
    }
    customElements.define('user-message-list', HTMLUserMessageListElement);

}