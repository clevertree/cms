document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })("/:content/:client/slideshow/content-slideshow.css");
});


class HTMLSlideShowPlayerElement extends HTMLElement {
    constructor() {
        super();
        this.timeout = null;
    }
    get duration() { return this.getAttribute('duration'); }
    set duration(v) { this.setAttribute('duration', v); }

    connectedCallback() {
        if(!this.duration)
            this.duration = 6000;
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.update());
    }

    disconnectedCallback() {
        clearTimeout(this.timeout);
    }

    update() {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.update(), this.duration);

        let currentSlide = 0;
        for(var i=0; i<this.children.length; i++) {
            if (this.children[i].classList.contains('current'))
                currentSlide = i;
            this.children[i].classList.remove('current');
        }
        currentSlide++;
        if(currentSlide >= this.children.length)
            currentSlide = 0;
        this.children[currentSlide].classList.add('current');
        // console.log("Update", this.children[currentSlide]);
    }
}
customElements.define('content-slideshow', HTMLSlideShowPlayerElement);