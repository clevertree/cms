
// Init
class DatabaseManager {
    constructor(db) {
        this.db = db;
    }

    query() {
        this.db.query(arguments[0], arguments[1], arguments[2]);
    }

    queryAsync(sql, values) {
        return new Promise( ( resolve, reject ) => {
            this.db.query(sql, values, ( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
            } );
        } );
    }
}

module.exports = {DatabaseManager};