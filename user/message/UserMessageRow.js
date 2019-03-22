class UserMessageRow {
    constructor(row) {
        Object.assign(this, row);
    }

    get url() { return '/:user/:message/' + (this.id); }
}

module.exports = UserMessageRow;

