document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("article/element/article.css");
});


class HTMLArticleBrowserElement extends HTMLElement {
    constructor() {
        super();
        this.state = {
            articles: [],
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
        this.addEventListener('submit', e => this.onSubmit(e));
        this.addEventListener('keyup', e => this.onKeyUp(e));
        this.render();
        this.onSubmit();
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
    //         if(!xhr.response || !xhr.response.article)
    //             throw new Error("Invalid Response");
    //         this.setState(xhr.response);
    //         // this.state = xhr.response.user;
    //         // this.render();
    //     };
    //     xhr.responseType = 'json';
    //     xhr.open ("GET", `:article/${this.state.article.id}/:json?getAll=true&getRevision=${new Date(this.state.revisionDate).getTime()}`, true);
    //     // xhr.setRequestHeader("Accept", "application/json");
    //     xhr.send ();
    //     this.setState({processing: true});
    // }

    onSubmit(e) {
        if(e) e.preventDefault();
        const form = e ? e.target : this.querySelector('form');
        const request = this.getFormData(form);
        const method = form.getAttribute('method');
        const action = form.getAttribute('action');

        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
            const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
            this.setState({status: xhr.status, processing: false}, response);
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
        form = form || this.querySelector('form');
        const formData = {};
        new FormData(form).forEach((value, key) => formData[key] = value);
        return formData;
    }

    render() {
        const formData = this.getFormData();
        console.log("RENDER", this.state);
        let searchField = this.querySelector('input[name=search]');
        const selectionStart = searchField ? searchField.selectionStart : null;
        this.innerHTML =
            `<form action="/:article/:list" method="POST" class="article article-browser themed">
            <fieldset>
                <table class="article">
                    <thead>
                        <tr>
                            <td colspan="5">
                                <input type="text" name="search" placeholder="Search Articles" value="${formData.search||''}"/>
                            </td>
                        </tr>
                        <tr><td colspan="5"><hr/></td></tr>
                        <tr style="text-align: left;">
                            <th>ID</th>
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
                                <div class="message">Article Browser</div> 
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </fieldset>
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
        resultsElement.innerHTML = this.state.articles.map(article => `
            <tr class="results ${classOdd=classOdd===''?'odd':''}">
                <td><a href=":article/${article.id}">${article.id}</a></td>
                <td style="text-align: left;"><a href="${article.path||`:article/${article.id}/:edit`}">${article.path||''}</a></td>
                <td style="text-align: left;"><a href=":article/${article.id}">${article.title}</a></td>
                
                <td><a href=":article/${article.id}/:edit" class="action-edit">&#x270D;</a></td>
                <td><a href=":article/${article.id}/:delete" class="action-edit">&#x26D4;</a></td>
                
            </tr>
            `).join('');

        const statusElement = this.querySelector('td.status');
        statusElement.innerHTML = this.state.message
            ? this.state.message
            : `Article Browser`;
    }
}
customElements.define('article-browser', HTMLArticleBrowserElement);