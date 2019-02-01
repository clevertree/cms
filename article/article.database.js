const { DatabaseManager } = require('../database/database.manager');

// Init
class ArticleDatabase {
    constructor(dbName, debug=false) {
        const tablePrefix = dbName ? `\`${dbName}\`.` : '';
        this.table = {
            article:            tablePrefix + '`article`',
            article_revision:   tablePrefix + '`article_revision`',
        };
        this.debug = debug;
    }

    async configure() {
        // Check for tables
        await DatabaseManager.configureTable(this.table.article,             ArticleRow.getTableSQL(this.table.article));
        await DatabaseManager.configureTable(this.table.article_revision,    ArticleRevisionRow.getTableSQL(this.table.article_revision));

        // Insert home page
        let homeArticle = await this.fetchArticleByPath("/");
        if(homeArticle) {
            console.info("Home Article Found: " + homeArticle.id);
        } else {
            let homeArticleTitle = 'Home';
            let homeArticleContent = '<%- include("article/home.ejs")%>';
            const homeArticleID = await this.insertArticle(homeArticleTitle, homeArticleContent, "/");
            console.info("Home Article Created: " + homeArticleID);
        }
    }

    /** Articles **/

    async selectArticles(whereSQL, values, selectSQL='a.*, null as content') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table.article} a
          WHERE ${whereSQL}`;

        const results = await DatabaseManager.queryAsync(SQL, values);
        return results ? results.map(result => new ArticleRow(result)) : null;
    }
    async fetchArticle(whereSQL, values, selectSQL='a.*, null as content') {
        const articles = await this.selectArticles(whereSQL, values, selectSQL);
        return articles[0] || null;
    }

    async fetchArticleByPath(renderPath) { return await this.fetchArticle('a.path = ? LIMIT 1', renderPath, 'a.*'); }
    async fetchArticleByID(articleID) { return await this.fetchArticle('a.id = ? LIMIT 1', articleID, 'a.*'); }

    // async fetchArticlesByFlag(flags, selectSQL = 'id, parent_id, path, title, flags') {
    //     if(!Array.isArray(flags))
    //         flags = flags.split(',');
    //     const whereSQL = flags.map(flag => 'FIND_IN_SET(?, a.flags)').join(' OR ');
    //     return await this.selectArticles(whereSQL, flags, selectSQL);
    // }

    async insertArticle(title, content, path, user_id, parent_id, theme, data) {
        let set = {};
        if(title) set.title = title;
        if(content) set.content = content;
        if(path) set.path = path;
        if(user_id !== null) set.user_id = user_id;
        if(parent_id !== null) set.parent_id = parent_id;
        if(theme) set.theme = theme;
        if(data !== null && typeof data === "object") set.data = JSON.stringify(data);
        let SQL = `
          INSERT INTO ${this.table.article}
          SET ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, set);
        return results.insertId;
    }

    async updateArticle(id, title, content, path, user_id, parent_id, theme, data) {
        let set = {};
        if(title) set.title = title;
        if(content) set.content = content;
        if(path) set.path = path;
        if(user_id !== null) set.user_id = user_id;
        if(parent_id !== null) set.parent_id = parent_id;
        if(theme) set.theme = theme;
        if(data !== null && typeof data === "object") set.data = JSON.stringify(data);
        let SQL = `
          UPDATE ${this.table.article} a
          SET ?, updated = UTC_TIMESTAMP()
          WHERE a.id = ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, [set, id]);
        return results.affectedRows;
    }

    /** Article Menu **/

    async queryMenuData(cascade=true) {
        let SQL = `
          SELECT a.id, a.parent_id, a.path, a.title
          FROM ${this.table.article} a
          WHERE a.path IS NOT NULL
`;
        const menuEntries = await DatabaseManager.queryAsync(SQL);
        if(!menuEntries || menuEntries.length === 0)
            throw new Error("No menu items found");
        if(!cascade)
            return menuEntries;

        const mainMenu = [];
        for(let i=0; i<menuEntries.length; i++) {
            const menuEntry = new ArticleRow(menuEntries[i]);
            if(menuEntry.parent_id === null) { // parent_id === null indicates top level menu
                const subMenu = [];
                mainMenu.push([menuEntry, subMenu]);
                for(let j=0; j<menuEntries.length; j++) {
                    const menuEntry2 = new ArticleRow(menuEntries[j]);
                    if(menuEntry.id === menuEntry2.parent_id) {
                        subMenu.push([menuEntry2, []]);
                    }
                }
            }
        }

        return mainMenu;
    }

    /** Article Revision **/

    async selectArticleRevision(whereSQL, values, selectSQL='ah.*') {
        let SQL = `
          SELECT ${selectSQL}
          FROM ${this.table.article_revision} ah
          WHERE ${whereSQL}
          `;

        const results = await DatabaseManager.queryAsync(SQL, values);
        return results.map(result => new ArticleRevisionRow(result))
    }

    // async fetchArticleRevisionByDate(articleID, revisionDate) {
    //     if(["string", "number"].indexOf(typeof revisionDate) !== -1)
    //         revisionDate = new Date(revisionDate);
    //     const revisions = await this.selectArticleRevision('*', 'ah.article_id = ? AND ah.created = ? LIMIT 1',
    //         [articleID, revisionDate]);
    //     return revisions[0];
    // }

    async fetchArticleRevisionByID(id, selectSQL = '*') {
        const revisions = await this.selectArticleRevision(`ah.id = ?`,
            [id], selectSQL);
        return revisions[0];
    }
    async fetchArticleRevisionByDate(created, selectSQL = '*') {
        const revisions = await this.selectArticleRevision(`ah.created = ?`,
            [created], selectSQL);
        return revisions[0];
    }

    async fetchArticleRevisionsByArticleID(articleID, limit=20, selectSQL = '*, NULL as content') {
        return await this.selectArticleRevision(`ah.article_id = ? ORDER BY ah.id DESC LIMIT ${limit}`,
            [articleID], selectSQL);
    }

    // Inserting revision without updating article === draft
    async insertArticleRevision(article_id, title, content, user_id) {
        let SQL = `
          INSERT INTO ${this.table.article_revision}
          SET ?
        `;
        const results = await DatabaseManager.queryAsync(SQL, {article_id, user_id, title, content});
        return results.insertId;
    }

}

class ArticleRow {
    static getTableSQL(tableName) {
        return `
CREATE TABLE ${tableName} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`user_id\` int(11) DEFAULT NULL,
  \`parent_id\` int(11) DEFAULT NULL,
  \`path\` varchar(256) DEFAULT NULL,
  \`title\` varchar(256) DEFAULT NULL,
  \`content\` text DEFAULT NULL,
  \`data\` JSON DEFAULT NULL,
  \`status\` SET('published') DEFAULT '',
  \`created\` datetime DEFAULT current_timestamp(),
  \`updated\` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk:article.path\` (\`path\`),
  KEY \`fk:article.user_id\` (\`user_id\`),
  CONSTRAINT \`fk:article.user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=404 DEFAULT CHARSET=utf8;
`
    }

    constructor(row) {
        this.id = row.id;
        this.parent_id = row.parent_id;
        this.user_id = row.user_id;
        this.path = row.path;
        this.title = row.title;
        this.theme = row.theme || 'default';
        this.status = row.status;
        // this.flags = row.flags ? row.flags.split(',') : [];
        this.content = row.content;
        this.created = row.created;
        this.updated = row.updated;
    }

    // hasFlag(flag) { return this.flags.indexOf(flag) !== -1; }
}

class ArticleRevisionRow {
    static getTableSQL(tableName) {
        return `
CREATE TABLE ${tableName} (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`article_id\` int(11) NOT NULL,
  \`user_id\` int(11) NOT NULL,
  \`title\` varchar(256) DEFAULT NULL,
  \`content\` TEXT,
  \`created\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx:article_revision.article_id\` (\`article_id\` ASC),
  KEY \`idx:article_revision.user_id\` (\`user_id\` ASC),

  CONSTRAINT \`fk:article_revision.article_id\` FOREIGN KEY (\`article_id\`) REFERENCES \`article\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk:article_revision.user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`
    }

    constructor(row) {
        this.id = row.id;
        this.article_id = row.article_id;
        this.user_id = row.user_id;
        this.title = row.title;
        if(row.content !== null)
            this.content = row.content;
        this.created = row.created;
    }
}

module.exports = {ArticleDatabase, ArticleEntry: ArticleRow, ArticleRevisionEntry: ArticleRevisionRow};

