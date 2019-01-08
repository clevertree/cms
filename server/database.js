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

    getArticleByPath(renderPath, callback) {
        let SQL = `
          SELECT a.*
          FROM article a
          WHERE a.path = ?`;
        this.app.db.query(SQL, [renderPath], (error, results, fields) => {
            callback(error, results && results[0] ? results[0] : null);
        });
    }

    getArticleByFlag(flags) { // Async with ejs?
        if(Array.isArray(flags))
            flags = flags.join(' ,')
        let SQL = `
          SELECT a.*
          FROM article a
          WHERE FIND_IN_SET(?, a.flag)`;
        this.app.db.query(SQL, [flags], (error, results, fields) => {
            callback(error, results);
        });
    }

}

module.exports = {DatabaseManager};