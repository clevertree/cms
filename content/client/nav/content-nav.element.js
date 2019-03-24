{
    function loadCSS() {
        ((INCLUDE_CSS) => {
            if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
                document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
        })(":content/:client/nav/content-nav.css");
    }
    loadCSS();

    const DEFAULT_PATHS = '/;/article;/upload;/about';
    class ThemeDefaultNavMenu extends HTMLElement{
        constructor() {
            super();
            this.state = {
                src: '/:content/:json',
                // paths: ['/','/about','/upload','/contact'],
                // userID: null,
                menu: [],
                contentList: [],
                linkList: null
            };
            // this.state = {id:-1, flags:[]};
        }

        setState(newState) {
            if(this.state.linkList === null)
                this.state.linkList = Array.prototype.slice.call(this.querySelectorAll('a[href]'));
            for(let i=0; i<arguments.length; i++)
               Object.assign(this.state, arguments[i]);
            this.render();
        }


        connectedCallback() {
            // this.addEventListener('change', e => this.onChange(e));
            // this.addEventListener('submit', e => this.onSubmit(e));

            // this.render();
            //
            // let paths = this.getAttribute('paths');
            // if(paths) {
            //     paths = paths.split(/[,;]/g).filter(p => !!p);
            //     this.setState({paths});
            // } else {
            // }
            // // if(userID)
            // //     this.setState({userID});
            setTimeout(() => this.requestFormData(), 1);
        }

        requestFormData() {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                this.setState({processing: false}, response);
            };
            xhr.responseType = 'json';
            xhr.open ('GET', this.state.src, true);
            xhr.send ();
            this.setState({processing: true});
        }

        buildMenu() {
            let menu = [];
            if(this.state.linkList) {
                menu = this.state.linkList.map(aElm => {
                    const rootPath = aElm.pathname;
                    let submenu = [];
                    // const menuEntry = {title:null, path: rootPath, content: null, submenu: []};
                    for (let i = 0; i < this.state.contentList.length; i++) {
                        const contentEntry = this.state.contentList[i];
                        if (!contentEntry.path)
                            continue;

                        if (contentEntry.path === rootPath) {
                            aElm.title = contentEntry.title;
                            // content = contentEntry;   // Found content entry for main menu link
                        } else if (contentEntry.path.indexOf(rootPath) === 0) {
                            if (rootPath !== '/')
                                submenu.push(`<a href="${contentEntry.path}">${contentEntry.title}</a>`);
                        }
                    }
                    // if(content)
                    //     aElm.title = content.title;
                    // else
                    //     title = rootPath.replace('/', '').replace(/[_-]+/g, ' ').replace(/^([a-z])|\s+([a-z])/g, function ($1) {
                    //         return $1.toUpperCase();
                    //     });
                    return {
                        linkHTML: aElm.outerHTML,
                        submenu
                    };
                });
            }


            const contentID = (document.head.querySelector('meta[name="content:id"]') || {}).content || null;
//             console.log(menu, rootPaths, this.state.contentList);
            const menuSubMenu = [];
            menu.push({
                linkHTML: `<a href='#'>Menu</a>`,
                submenu: menuSubMenu
            })

            if(contentID) {
                menuSubMenu.push(`<a href='/:content/${contentID}/:edit'>Edit Page Content</a>`);
                menuSubMenu.push('<hr/>');
            }

            // Check for log in session userID
            const userID = (document.head.querySelector('meta[name="session:userID"]') || {}).content || null;

            if(userID) {
                menuSubMenu.push(`<a href='/:user/:message/:list'>Inbox</a>`);
                menuSubMenu.push(`<a href='/:user/${userID}'>My Profile</a>`);
                menuSubMenu.push(`<a href='/:user/${userID}/:edit'>Edit Profile</a>`);
                menuSubMenu.push(`<a href='/:user/:logout'>Log Out</a>`);

            } else {
                menuSubMenu.push(`<a href='/:user/:login'>Log In</a>`);
                menuSubMenu.push(`<a href='/:user/:register'>Register</a>`);
            }
            menuSubMenu.push('<hr/>');
            menuSubMenu.push(`<a href='/:task'>Task List</a>`);

            menuSubMenu.push('<hr/>');
            menuSubMenu.push(`<a href='/:user'>User Index</a>`);
            menuSubMenu.push(`<a href='/:content'>Site Index</a>`);
            // menuSubMenu.push(`<a href='/:config'>Configure Site</a>`);


            return menu;
        }
        
        render() {
            const menu = this.buildMenu();
//             console.log("RENDER", this.state, menu);
//         <link href=":content/:client/nav/content-nav.css" rel="stylesheet" />

            this.innerHTML =
                `
                <ul class="menu">
                ${menu.map(menuItem => `
                    <li>
                        ${menuItem.linkHTML}
                        ${menuItem.submenu && menuItem.submenu.length === 0 ? `` : `
                        <ul class="submenu">
                            ${menuItem.submenu
                                .map(submenuItem => `<li>${submenuItem}</li>`)
                                .join('')}
                        </ul>
                    </li>
                    `}
                `).join('')}
                </ul>
`;
        }
    }
    customElements.define('content-nav', ThemeDefaultNavMenu);

}


// TODO: live load articles
// (function() {
//
//     window.addEventListener('hashchange', onHashChange);
//
//     function onHashChange(e) {
//         const hash = window.location.hash.substr(1);
//         if(hash) {
//             document.querySelectorAll('article.page-view').forEach(function (articleElm) {
//                 articleElm.classList.toggle('selected', articleElm.getAttribute('data-path') === hash);
//             });
//             if(!document.querySelector('article.page-view.selected'))
//                 document.querySelector('article.page-view-default').classList.toggle('selected');
//             e.preventDefault();
//         }
//     }
//     document.addEventListener('DOMContentLoaded', onHashChange);
// })()