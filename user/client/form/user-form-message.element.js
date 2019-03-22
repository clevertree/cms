document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserMessageElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                id: '',
                to: null,
                from: null,
                subject: null,
                body: null
            };
        }
        get action() { return `/:user/:message/${this.state.id}`}

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
                this.processHeaderTags(response);
                this.setState({processing: false}, response);
            };
            xhr.responseType = 'json';
            xhr.open ('OPTIONS', this.action, true);
            xhr.send ();
            this.setState({processing: true});
        }

        processHeaderTags(response) {
            const splitPos = response.body.indexOf("\n\n");
            if(splitPos <= 0)
                return;
            const headerString = response.body.substring(0, splitPos);
            if(!headerString)
                return;

            response.body = response.body.substring(splitPos+2);
            response.headers = [];
            headerString
                .split(/\n/g)
                .forEach(header => {
                    const split = header.split(/:/);
                    if(split.length > 1)
                        response.headers[split[0].trim().toLowerCase()] = split[1].trim();
                });
            if(response.headers.from && !this.state.from)
                this.state.from = response.headers.from;
            if(response.headers.to && !this.state.to)
                this.state.to = response.headers.to;
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
            this.innerHTML =
                `
                <form action="${this.action}/:reply" method="POST" class="user user-form-message themed">
                    <table class="user themed">
                        <caption>Read Message #${this.state.id}</caption>
                        <tbody>
                             <tr>
                                <td><label for="to">To:</label></td>
                                <td class="user-form-message-to">${this.state.to}</td>
                            </tr>
                            <tr>
                                <td><label for="name">From:</label></td>
                                <td class="user-form-message-form">${this.state.from}</td>
                            </tr>
                            <tr>
                                <td><label for="subject">Subject:</label></td>
                                <td>${this.state.subject}</td>
                            </tr>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td colspan="2">
                                    <div class="body-content">${(this.state.body||'').replace("<", "&lt;")}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </form>
                <form action="${this.action}/:reply" method="POST" class="user user-form-message-reply themed">
                    <table class="user themed">
                        <tbody>
                            <tr>
                                <td colspan="2">
                                    <textarea name="reply" placeholder="Enter your reply here"></textarea>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2">
                                    <button type="submit">Reply</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </form>
`;
        }
    }
    customElements.define('user-form-message', HTMLUserMessageElement);

}