document.addEventListener('DOMContentLoaded', function() {
    ((INCLUDE_CSS) => {
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    })(":theme/default/:client/default.theme.css");
});

{
    class ThemeDefaultNavMenu extends HTMLElement{
        constructor() {
            super();
            this.state = {
                src: '/:content/:browse',
                menu: []
            };
            // this.state = {id:-1, flags:[]};
        }

        setState(newState) {
            for(let i=0; i<arguments.length; i++)
               Object.assign(this.state, arguments[i]);
            this.render();
        }


        connectedCallback() {
            // this.addEventListener('change', e => this.onChange(e));
            // this.addEventListener('submit', e => this.onSubmit(e));

            this.render();
            this.requestFormData();
        }

        requestFormData() {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                const response = typeof xhr.response === 'object' ? xhr.response : {message: xhr.response};
                this.setState({processing: false}, response);
            };
            xhr.responseType = 'json';
            xhr.open ('OPTIONS', this.state.src, true);
            xhr.send ();
            this.setState({processing: true});
        }

        buildMenu() {
            let menu = [];
            let rootPaths = [];
            if(this.state.contentList) {
                for (let i = 0; i < this.state.contentList.length; i++) {
                    const contentEntry = this.state.contentList[i];
                    if (!contentEntry.path)
                        continue;

                    const rootPath = '/' + contentEntry.path.split('/')[1].split(/\W/g)[0];
                    if (rootPaths.indexOf(rootPath) === -1)
                        rootPaths.push(rootPath);
                }

                menu = rootPaths.map(rootPath => {
                    const menuEntry = {path: rootPath, content: null, subMenu: []};
                    for (let i = 0; i < this.state.contentList.length; i++) {
                        const contentEntry = this.state.contentList[i];
                        if (!contentEntry.path)
                            continue;

                        if (contentEntry.path === rootPath) {
                            menuEntry.content = contentEntry;
                        } else if (contentEntry.path.indexOf(rootPath) === 0) {
                            if (rootPath !== '/')
                                menuEntry.subMenu.push(contentEntry);
                        }
                    }
                    return menuEntry;
                });
            }
            console.log(menu, rootPaths, this.state.contentList);
            return menu;
            // if (!req.session || !req.session.userID) { // If not logged in
            //     menu.push({
            //         path: '/:user/:login',
            //         title: 'Log In',
            //         subMenu: [{
            //             path: '/:user/:register',
            //             title: 'Register'
            //         }, "<hr/>", {
            //             path: '/:task',
            //             title: `Browse Tasks`
            //         }, "<hr/>", {
            //             path: '/:content',
            //             title: 'Browse Content'
            //         }]
            //     })
            // } else { // If Logged In
            //     const submenu = [];
            //     menu.push({
            //         path: `/:user/${req.session.userID}`,
            //         title: 'Menu',
            //         subMenu: submenu
            //     });
            //     if (content.id) {
            //         submenu.push({
            //             path: `/:content/${content.id}/:edit`,
            //             title: 'Edit This Page\'s Content',
            //         });
            //     }
            //     submenu.push({
            //         path: '/:content',
            //         title: 'Site Index'
            //     }, "<hr/>", {
            //         path: '/:task',
            //         title: `Browse Tasks`
            //     }, {
            //         path: '/:config',
            //         title: 'Configure Site'
            //     }, "<hr/>", {
            //         path: '/:file',
            //         title: 'Browse Files'
            //     }, "<hr/>", {
            //         path: '/:user',
            //         title: 'Browse Users'
            //     }, {
            //         path: `/:user/${req.session.userID}`,
            //         title: 'My Profile',
            //     }, {
            //         path: `/:user/${req.session.userID}/:edit`,
            //         title: 'Edit Profile',
            //     }, {
            //         path: `/:user/:logout`,
            //         title: 'Log Out',
            //     });
            // }

            // return `
            // <nav>
            //     <ul class="nav-menu">
            //         ${menu.map(menuItem => `
            //         <li>
            //             <a href="${menuItem.path}">${menuItem.title}</a>
            //             ${menuItem.subMenu && menuItem.subMenu.length === 0 ? `` : `
            //             <ul class="nav-submenu">
            //                 ${menuItem.subMenu.map(subMenuItem => {
            //     if(typeof subMenuItem === "string")
            //         return subMenuItem;
            //
            //     return `<li><a href="${subMenuItem.path}">${subMenuItem.title}</a></li>`;
            // }).join('')}
            //             </ul>
            //             `}
            //         </li>
            //         `).join('')}
            //     </ul>
            // </nav>
// `
        }
        
        render() {
            const menu = this.buildMenu();
            console.log("RENDER", this.state, menu);
            this.innerHTML =
                `
                <ul class="nav-menu">
                    ${menu.map(menuItem => `
                    <li>
                        <a href="${menuItem.path}">${menuItem.content.title}</a>
                        ${menuItem.subMenu && menuItem.subMenu.length === 0 ? `` : `
                        <ul class="nav-submenu">
                            ${menuItem.subMenu.map(subMenuItem => {
                                if(typeof subMenuItem === "string")
                                    return subMenuItem;
            
                                return `<li><a href="${subMenuItem.path}">${subMenuItem.title}</a></li>`;
                            }).join('')}
                        </ul>
                        `}
                    </li>
                    `).join('')}
                </ul>
`;
        }
    }
    customElements.define('theme-default-nav-menu', ThemeDefaultNavMenu);

}