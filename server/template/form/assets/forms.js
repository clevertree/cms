document.addEventListener('DOMContentLoaded', function() {

    document.addEventListener('submit', submitForm);


    function submitForm(e) {
        const form = e.target;
        switch(new URL(form.action).pathname) {
            case "/user/login":
            case "/user/logout":
            case "/user/register":
            case "/user/account":
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