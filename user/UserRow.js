class UserRow {

    constructor(row) {
        Object.assign(this, row);
        this.profile = this.profile ? JSON.parse(this.profile) : {};
        this.flags = this.flags.split(',');
    }

    get url() { return '/:user/' + (this.username || this.id); }
    hasFlag(flag) { return this.flags && this.flags.indexOf(flag) !== -1; }
    isAdmin() { return this.hasFlag('admin'); }
    emailCanReceive() { return this.hasFlag('email'); }
    emailInsecure() { return this.hasFlag('email:view'); }
    // isGuest() { return this.hasFlag('guest'); }
}


module.exports = UserRow;

