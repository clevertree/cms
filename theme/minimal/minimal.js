(function() {
    window.addEventListener('hashchange', onHashChange);

    function onHashChange(e) {
        const hash = window.location.hash.substr(1);
        if(hash) {
            document.querySelectorAll('article.page-article').forEach(function (articleElm) {
                articleElm.classList.toggle('selected', articleElm.getAttribute('data-path') === hash);
            });
            if(!document.querySelector('article.page-article.selected'))
                document.querySelector('article.page-article-default').classList.toggle('selected');
            e.preventDefault();
        }
    }
    document.addEventListener('DOMContentLoaded', onHashChange);
})()