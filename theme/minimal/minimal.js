(function() {
    window.addEventListener('hashchange', onHashChange);

    function onHashChange(e) {
        const hash = window.location.hash.substr(1);
        if(hash) {
            document.querySelectorAll('view.page-view').forEach(function (articleElm) {
                articleElm.classList.toggle('selected', articleElm.getAttribute('data-path') === hash);
            });
            if(!document.querySelector('view.page-view.selected'))
                document.querySelector('view.page-view-default').classList.toggle('selected');
            e.preventDefault();
        }
    }
    document.addEventListener('DOMContentLoaded', onHashChange);
})()