document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserMessageSendElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                message: null,
                status: 0,
                userList: [],
                to: '',
                from: '',
            };
            this.originalInnerHTML = null;
        }

        setState(newState) {
            for(let i=0; i<arguments.length; i++)
                Object.assign(this.state, arguments[i]);
            this.render();
        }

        connectedCallback() {
            this.addEventListener('change', e => this.onChange(e));
            this.addEventListener('submit', e => this.onSubmit(e));

            const to = this.getAttribute('to');
            if(to)
                this.state.to = to;

            setTimeout(() => {
                this.originalInnerHTML = this.innerHTML.trim();
                this.render();
                this.requestFormData();
            }, 1);
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
                if(xhr.status === 200)
                    delete response.message;
                if(!this.state.to && response.userList[0])
                    this.state.to = response.userList[0].username;
                this.setState({processing: false}, response);
            };
            xhr.responseType = 'json';
            xhr.open ('OPTIONS', '/:user/:message', true);
            xhr.send ();
            this.setState({processing: true});
        }


        onSubmit(e) {
            e.preventDefault();
            const form = e.target;
            let request = {
                to: form.elements.to ? form.elements.to.value : this.state.to,
                subject: form.elements.subject ? form.elements.subject.value : '',
                body: form.elements.body ? form.elements.body.value : '',
            };
            Array.prototype.filter
                .call(form ? form.elements : [], (input, i) => !!input.name && (input.type !== 'checkbox' || input.checked))
                .filter((input, i) => typeof request[input.name] === "undefined")
                .forEach((input, i) => request.body += "\n\n" + input.name + ':\n' +input.value);

            const formValues = Object.keys(request)
                .map((key, i) => key + '=' + encodeURIComponent(request[key]))
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
            if(this.originalInnerHTML) {
                this.innerHTML = this.originalInnerHTML;
            } else {
                this.innerHTML =
                    `
                    <table class="user themed">
                        <caption>Send a Message</caption>
                        <thead>
                            <tr>
                                <td colspan="5" class="status">
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><label for="to">To:</label></td>
                                <td>
                                    <input name="to" id="to" list="userList" value="${this.state.to}" required />
                                    <datalist id="userList"></datalist>
                                </td>
                            </tr>
                            ${!this.state.isLoggedIn ? `
                            <tr>
                                <td><label for="name">Your Name:</label></td>
                                <td><input name="name" id="name" required></td>
                            </tr>
                            <tr>
                                <td><label for="from">Your Email:</label></td>
                                <td><input name="from" id="from" type="email" value="${this.state.from}" placeholder="your@email.com" required></td>
                            </tr>
                            ` : ``}
                            <tr>
                                <td><label for="subject">Subject:</label></td>
                                <td><input name="subject" id="subject" type="text" placeholder="Message Subject" required></td>
                            </tr>
                            <tr>
                                <td><label for="body">Message:</label></td>
                                <td>
                                    <textarea name="body" id="body"
                                        placeholder="Type your message here"
                                        required></textarea>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td colspan="2">
                                    <button type="submit" class="themed">Submit</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
`;
                console.log("STATE", this.state);
            }
            let form = this.querySelector('form');
            if(!form)
                this.innerHTML = `
                <form class="user user-message-send themed">
                    ${this.innerHTML}
                </form>`;
            form = this.querySelector('form');
            form.setAttribute('action', '/:user/:message');
            form.setAttribute('method', 'POST');

            const userListDL = this.querySelector('select[name=to], #userList');
            if(userListDL) {
                userListDL.innerHTML = this.state.userList
                    .map(user => `<option value="${user.username}">${user.username}</option>`)
                    .join('');

            }

            let statusElement = this.querySelector('div.status,td.status');
            if(!statusElement) {
                this.innerHTML = `<div class="status"></div>` + this.innerHTML;
                statusElement = this.querySelector('div.status,td.status');
            }
            if(this.state.message)
                statusElement.innerHTML =
                    `<div class="${this.state.status === 200 ? 'success' : (!this.state.status ? 'message' : 'error')} status-${this.state.status}">
                        ${this.state.message}
                    </div>`
        }
    }
    customElements.define('user-message-send', HTMLUserMessageSendElement);

}