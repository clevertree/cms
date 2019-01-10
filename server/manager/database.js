const mysql = require('mysql');

// Init
class DatabaseManager {
    constructor(app) {
        this.app = app;
        this.instance = null;
    }

    connect() {
        // Mysql
        const dbConfig = this.app.config.mysql;
        const db = mysql.createConnection(dbConfig);
        this.instance = db;

        db.on('error', function (err){
            console.error("DB Error", err);
        });
        db.connect({}, (err) => {
            if (err) {
                console.error(`DB Connection to '${dbConfig.database}' Failed`, err.message);
                setTimeout(() => this.connect(), 3000);
                db.end();
            } else {
                console.info(`DB Connecting to '${dbConfig.database}' Successful`);
            }
        });
    }

    query() {
        this.instance.query(arguments[0], arguments[1], arguments[2]);
    }

    queryAsync(sql, values) {
        return new Promise( ( resolve, reject ) => {
            this.instance.query(sql, values, ( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
            } );
        } );
    }
}

module.exports = {DatabaseManager};