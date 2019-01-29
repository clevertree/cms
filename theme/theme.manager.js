const path = require('path');


const THEME_DIR = path.resolve((__dirname));

class ThemeManager {
    constructor() {
        this.themes = {};
    }


    get(themeName) {
        if(!themeName)
            themeName = 'default';
        if(!themeName)
            throw new Error("Invalid Theme");
        if(typeof this.themes[themeName] !== 'undefined')
            return this.themes[themeName];
        const themeClass = require(THEME_DIR + '/' + themeName + '/' + themeName + '.theme.js');
        this.themes[themeName] = new themeClass(this);
        return this.themes[themeName];
    }
}

// ThemeManager.DEFAULT = {
//     debug: true,
// };

exports.ThemeManager = new ThemeManager();
