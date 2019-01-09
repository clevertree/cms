document.addEventListener('DOMContentLoaded', function() {

    document.addEventListener('submit', submitForm);

    // TODO: Populate form field

    function submitForm(e) {
        if(e.defaultPrevented)
            return;
        const form = e.target;
        switch(new URL(form.action).pathname) {
            case "/article/edit":
            case "/article/delete":
            case "/article/new":
                break;
            default:
                return;
        }
        e.preventDefault();
        var request = {};
        new FormData(form).forEach(function(value, key){
            request[key] = value;
        });

        var xhr = new XMLHttpRequest();
        xhr.onload = function(){ alert (xhr.responseText); }
        xhr.open (form.method, form.action, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send (JSON.stringify(request));
        console.log(request);
    }
});