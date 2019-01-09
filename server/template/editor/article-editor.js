document.addEventListener('DOMContentLoaded', function() {
    const formEditArticle = document.querySelector('form.form-article-edit');

    if(formEditArticle) {
        // Populate Form Data
        formEditArticle.loadArticle = function(id) {
            var xhr = new XMLHttpRequest();
            xhr.onload = () => {
                var json = xhr.response;
                for(var i=0; i<formEditArticle.elements.length; i++) {
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
        formEditArticle.loadArticle(1);

        // Submit Form
        formEditArticle.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;
            var request = {};
            new FormData(form).forEach(function(value, key){
                request[key] = value;
            });

            var xhr = new XMLHttpRequest();
            xhr.onload = function(){ alert (xhr.responseText); };
            xhr.open (form.method, form.action, true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.send (JSON.stringify(request));
            console.log(request);
        });
    }
});