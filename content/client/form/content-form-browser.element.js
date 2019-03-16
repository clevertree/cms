document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":content/:client/form/content-form.css");
});


class HTMLContentBrowserElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            message: "Browsing Content",
            status: 0,
            processing: false,
            contentList: []
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
        this.addEventListener('submit', e => this.onSubmit(e));
        this.addEventListener('change', e => this.onChange(e));
        this.addEventListener('keyup', e => this.onKeyUp(e));
        this.render();
        this.onSubmit();
    }

    onSuccess(response) {
        // console.log(response);
        if(response.redirect) {
            this.setState({processing: true});
            setTimeout(() => window.location.href = response.redirect, 2000);
        }
    }

    onError(response) {
            console.error(response.message || 'Error: ', response);
        }

    onChange(e) {
        if(typeof this.state[e.target.name] !== 'undefined')
            this.state[e.target.name] = e.target.value;
    }

    onKeyUp(e) {
        switch(e.target.name) {
            case 'search':
                clearTimeout(this.keyTimeout);
                this.keyTimeout = setTimeout(e => this.onSubmit(), 500);
                break;
        }
    }


    // requestFormData() {
    //     const xhr = new XMLHttpRequest();
    //     xhr.onload = () => {
    //         this.setState({processing: false});
    //         // console.info(xhr.response);
    //         if(!xhr.response || !xhr.response.content)
    //             throw new Error("Invalid Response");
    //         this.setState(xhr.response);
    //         // this.state = xhr.response.user;
    //         // this.render();
    //     };
    //     xhr.responseType = 'json';
    //     xhr.open ("GET", `:content/${this.state.content.id}/:json?getAll=true&getRevision=${new Date(this.state.revisionDate).getTime()}`, true);
    //     // xhr.setRequestHeader("Accept", "application/json");
    //     xhr.send ();
    //     this.setState({processing: true});
    // }

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
        // console.log("RENDER", this.state);
        let searchField = this.querySelector('input[name=search]');
        const selectionStart = searchField ? searchField.selectionStart : null;
        this.innerHTML =
        `<form action="/:content/:list" method="POST" class="content content-form-browser themed">
            <table class="content themed">
                <caption>Search Content</caption>
                <thead>
                    <tr>
                        <td colspan="5">
                            <input type="text" name="search" placeholder="Search Content" value="${this.state.search||''}"/>
                        </td>
                    </tr>
                    <tr><td colspan="5"><hr/></td></tr>
                    <tr style="text-align: left;">
                        <th style="min-width: 50px;">ID</th>
                        <th>Path</th>
                        <th>Title</th>
                        <th>Edit</th>
                        <th>Delete</th>
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
                            <div class="message">Content Browser</div> 
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
        resultsElement.innerHTML = this.state.contentList.map(content => `
            <tr class="results ${classOdd=classOdd===''?'odd':''}">
                <td><a href=":content/${content.id}">${content.id}</a></td>
                <td><a href="${content.path||`:content/${content.id}/:edit`}">${content.path||''}</a></td>
                <td><a href=":content/${content.id}">${content.title}</a></td>
                
                <td><a href=":content/${content.id}/:edit" class="action-edit">&#x270D;</a></td>
                <td><a href=":content/${content.id}/:delete" class="action-edit">&#x26D4;</a></td>
                
            </tr>
            `).join('');

        const statusElement = this.querySelector('td.status');
        statusElement.innerHTML = this.state.message
            ? this.state.message
            : `Content Browser`;
    }
}
customElements.define('content-form-browser', HTMLContentBrowserElement);