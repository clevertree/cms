document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("app/article/element/articleform.css");
});


class HTMLArticleFormBrowserElement extends HTMLElement {
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
        Object.assign(this.state, newState);
        this.render();
    }

    connectedCallback() {
        this.addEventListener('keyup', this.onEvent);
        this.addEventListener('submit', this.onEvent);
        this.render();
        this.submit();
    }

    onSuccess(e, response) {
        // if(response.redirect)
        //     setTimeout(() => window.location.href = response.redirect, 3000);
    }
    onError(e, response) {}

    onEvent(e) {
        switch (event.type) {
            case 'submit':
                this.submit(e);
                break;

            case 'keyup':
                switch(e.target.name) {
                    case 'search':
                        clearTimeout(this.keyTimeout);
                        this.keyTimeout = setTimeout(e => this.submit(), 500);
                        break;
                }
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
    //     xhr.open ("GET", `:article/${this.state.article.id}/json?getAll=true&getRevision=${new Date(this.state.revisionDate).getTime()}`, true);
    //     // xhr.setRequestHeader("Accept", "application/json");
    //     xhr.send ();
    //     this.setState({processing: true});
    // }

    submit(e) {
        if(e)
            e.preventDefault();
        const form = this.querySelector('form');
        this.setState({processing: true});
        const formData = this.getFormData();

        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
            this.setState({processing: false});
            console.log(e, xhr.response);
            const response = xhr.response && typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
            response.status = xhr.status;
            if(xhr.status === 200) {
                this.onSuccess(e, response);
            } else {
                this.onError(e, response);
            }
            this.setState(response);
        };
        xhr.open(form.getAttribute('method'), form.getAttribute('action'), true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        // xhr.setRequestHeader("Accept", "application/json");
        xhr.responseType = 'json';
        xhr.send(JSON.stringify(formData));
        this.setState({processing: true});
    }

    getFormData() {
        const form = this.querySelector('form');
        const formData = {};
        if(form) {
            new FormData(form).forEach(function (value, key) {
                formData[key] = value;
            });
        }
        return formData;
    }

    render() {
        const formData = this.getFormData();
        console.log("RENDER", this.state);
        let searchField = this.querySelector('input[name=search]');
        const selectionStart = searchField ? searchField.selectionStart : null;
        this.innerHTML =
            `<form action="/:article/list" method="POST" class="articleform articleform-browser themed">
            <fieldset>
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <td colspan="4">
                                <input type="text" name="search" placeholder="Search Articles" value="${formData.search||''}"/>
                            </td>
                        </tr>
                        <tr><td colspan="4"><hr/></td></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Path</th>
                            <th>Actions</th>
                        </tr>
                        ${this.state.articles.map(article => `
                        <tr>
                            <th>${article.id}</th>
                            <td><a href=":article/${article.id}/edit">${article.title}</a></td>
                            <td><a href=":article/${article.id}/edit">${article.path||''}</a></td>
                            <td>
                                <a href=":article/${article.id}/edit">[edit]</a>
                                <a href=":article/${article.id}/delete">[delete]</a>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr><td colspan="4"><hr/></td></tr>
                        <tr>
                            <td colspan="4">
                                ${this.state.message ? `<div class="${this.state.status === 200 ? 'success' : 'error'}">
                                    ${this.state.message}
                                </div>` : `Article Browser`}
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
    }
}
customElements.define('articleform-browser', HTMLArticleFormBrowserElement);