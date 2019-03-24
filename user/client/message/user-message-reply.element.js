document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserMessageReplyElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                message: null,
                status: 0,
                userList: [],
                id: null,
                subject: null,
                replyBody: null,
            };
        }
        get actionJSON() { return `/:user/:message/${this.state.id}/:json`}
        get action() { return `/:user/:message/`}

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


            setTimeout(() => {
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
                if(response.subject)
                    response.subject = 'RE: ' + response.subject.replace(/^RE:\s*/, '');
                response.body = '';
                this.setState({processing: false}, response);
            };
            xhr.responseType = 'json';
            xhr.open ('GET', this.actionJSON, true);
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
            console.log("STATE", this.state);
                this.innerHTML =
                `
                <form action="${this.action}" method="POST" class="user user-message themed">
                    <input type="hidden" name="to" value="${this.state.sender_user_id}" />
                    <table class="user themed">
                        ${this.state.message ? `
                        <thead>
                            <tr>
                                <td>
                                    <div class="${this.state.status === 200 ? 'success' : (!this.state.status ? 'message' : 'error')} status-${this.state.status}">
                                        ${this.state.message}
                                    </div>
                                </td>
                            </tr>
                            <tr><td colspan="2"><hr/></td></tr>
                        </thead>
                        ` : ``}
                        <tbody>
                            <tr>
                                <td>
                                    <input name="subject" placeholder="Enter your subject here" value="${this.state.subject}" />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <textarea name="body" placeholder="Enter your reply here" required>${this.state.replyBody||''}</textarea>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td><hr/></td></tr>
                            <tr>
                                <td style="text-align: right;">
                                    <button type="submit" class="themed">Submit Reply</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </form>
`;
        }
    }
    customElements.define('user-message-reply', HTMLUserMessageReplyElement);

}