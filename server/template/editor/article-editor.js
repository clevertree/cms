document.addEventListener('DOMContentLoaded', function() {
    const formEditArticle = document.querySelector('form.form-article-edit');

    if(formEditArticle) {
        // Populate Form Data
        formEditArticle.loadArticle = function(id) {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                const json = xhr.response;
                for(let i=0; i<formEditArticle.elements.length; i++) {
                    const input = formEditArticle.elements[i];
                    if(input.name && typeof json[input.name] !== 'undefined')
                        input.value = json[input.name];
                }
            };
            xhr.responseType = 'json';
            xhr.open ("GET", `:article/${id}`, true);
            xhr.setRequestHeader("Accept", "application/json");
            xhr.send ();
        };

        // Submit Form
        formEditArticle.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;
            const request = {};
            new FormData(form).forEach(function(value, key){
                request[key] = value;
            });

            const xhr = new XMLHttpRequest();
            xhr.onload = function(){ alert (xhr.responseText); };
            xhr.open (form.method, form.action, true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.send (JSON.stringify(request));
            console.log(request);
        });

        const loadArticleID = new FormData(formEditArticle).get('id');
        if(loadArticleID) {
            console.log("Loading article ID " + loadArticleID);
            formEditArticle.loadArticle(loadArticleID);
        }
    }
});