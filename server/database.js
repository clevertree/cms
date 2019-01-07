const mysql = require('mysql');

// Init
class DatabaseManager {
    constructor(app) {
        this.app = app;
    }

    connect() {
        // Mysql
        const dbConfig = this.app.config.mysql;
        const db = mysql.createConnection(dbConfig);
        this.db = db;

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
}

module.exports = {DatabaseManager};