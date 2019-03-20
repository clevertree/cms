document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":user/:client/form/user-form.css");
});

{
    class HTMLUserContactElement extends HTMLElement{
        constructor() {
            super();
            this.state = {
                message: "Please fill out the form and hit submit below",
                status: 0,
                userList: []
            };
        }

        setState(newState) {
            for(let i=0; i<arguments.length; i++)
                Object.assign(this.state, arguments[i]);
            this.render();
        }

        connectedCallback() {
            this.addEventListener('change', e => this.onChange(e));
            this.addEventListener('submit', e => this.onSubmit(e));
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
                this.setState({processing: false}, xhr.response);
            };
            xhr.responseType = 'json';
            xhr.open ('OPTIONS', '/:user/:message?sort=asc&by=id', true);
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
            if(!this.innerHTML.trim())
                this.innerHTML =
                `
                    <table class="themed">
                        <caption>Contact Us</caption>
                        <tbody>
                            <tr>
                                <td><label for="to">To:</label></td>
                                <td>
                                    <input name="to" id="to" list="userList" required />
                                    <datalist id="userList"></datalist>
                                </td>
                            </tr>
                            <tr>
                                <td><label for="name">Your Name:</label></td>
                                <td><input name="name" id="name" required></td>
                            </tr>
                            <tr>
                                <td><label for="email">Your Email:</label></td>
                                <td><input name="email" id="email" type="email" placeholder="your@email.com" required></td>
                            </tr>
                            <tr>
                                <td><label for="message">Message:</label></td>
                                <td>
                                    <textarea name="message" id="message"
                                        placeholder="Type your message here"
                                        required></textarea>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td colspan="2"><hr/></td></tr>
                            <tr>
                                <td colspan="2">
                                    <button type="submit">Submit</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
`;
            let form = this.querySelector('form');
            if(!form)
                this.innerHTML = `
                <form class="user user-form-message themed">
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
        }
    }
    customElements.define('user-form-message', HTMLUserContactElement);

}