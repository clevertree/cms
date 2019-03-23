
const classes = {


    InteractiveConfig:      require('./config/InteractiveConfig'),
    LocalConfig:            require('./config/LocalConfig'),

    ContentAPI:             require('./content/ContentAPI'),
    ContentRenderer:        require('./content/ContentRenderer'),
    ContentRevisionRow:     require('./content/revision/ContentRevisionRow'),
    ContentRevisionTable:   require('./content/revision/ContentRevisionTable'),
    ContentRow:             require('./content/ContentRow'),
    ContentTable:           require('./content/ContentTable'),

    DatabaseAPI:            require('./database/DatabaseAPI'),
    DatabaseClient:        require('./database/DatabaseClient'),
    ConfigureDatabaseMail:  require('./database/mail/ConfigureDatabaseMail'),


    MailClient:             require('./mail/MailClient'),

    DNSManager:             require('./server/DNSManager'),
    DomainAPI:              require('./server/DomainAPI'),
    DomainRow:              require('./server/DomainRow'),
    DomainTable:            require('./server/DomainTable'),
    HTTPServer:             require('./server/HTTPServer'),


    TaskAPI:                require('./task/TaskAPI'),

    UserAPI:                require('./user/UserAPI'),
    UserRow:                require('./user/UserRow'),
    UserTable:              require('./user/UserTable'),

    UserMessageTable:       require('./user/message/UserMessageTable'),
    UserMessageRow:         require('./user/message/UserMessageRow'),
    UserMessageAPI:         require('./user/message/UserMessageAPI'),

    SessionAPI:             require('./user/session/SessionAPI'),

    task: {
        DatabaseConfigureTask:  require('./database/task/DatabaseConfigureTask'),
    },

    version:                require('././package.json').version,

    configure: async function() {
        return await new classes.HTTPServer().configure();
    },
    getMiddleware: function(config=null) {
        const httpServer = new classes.HTTPServer(config);
        return httpServer.getMiddleware();
    }
};

module.exports = classes;
