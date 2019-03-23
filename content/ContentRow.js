class ContentRow {

    constructor(row) {
        Object.assign(this, row);
    }


    get mimeType() {
        const ext = path.extname(this.path);
        if(!ext)
            return null;
        const mime = require('mime');
        return mime.lookup(ext);
    }


    get url() { return this.path || `/:content/${this.id}/`}
    // hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }
}

module.exports = ContentRow;
