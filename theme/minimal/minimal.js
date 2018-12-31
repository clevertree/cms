(function() {
    window.addEventListener('hashchange', onHashChange);

    function onHashChange(e) {
        const hash = window.location.hash.substr(1);
        console.log(hash, e);
        document.querySelectorAll('article.page-article').forEach(function(articleElm) {
            articleElm.classList.toggle('selected', articleElm.getAttribute('id') === hash);
        })
    }
    document.addEventListener('DOMContentLoaded', onHashChange);
})()