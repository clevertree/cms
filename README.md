# Clevertree CMS

```
“Perfection is achieved, not when there is nothing more to add, 
 but when there is nothing left to take away.” 
                                                ― Antoine de Saint-Exupéry
```

## Introduction
Clevertree CMS is a light-weight and high performance **UCMS** (_Universal Content Management System_)
with a primary goal for **all** of its content is transferable with other UCMS by the *simplest possible interface*.


#### Perquisites
* nodejs
* MySQL/MariaDB Server



#### What's Currently Working?
* HTML-based content management with historic revisions
* Upload files and create pages to any path
* Host unlimited domains on a single node instance
* Free, automated SSL via greenlock
* Request administrator access by setting the domain's SOA email
* Can be used stand-alone, or as a middleware within another NodeJS app
* CMS API middleware can be enabled individually (example: content management @ /:content/ with no user management @ /:user/)
* User services: Add, edit, reset / change password, list, delete, private message
* Content services: Add, edit, multi-upload, delete, WYSIWYG editor
* Interactive configuration



#### Planned Features
* Content templates
* MarkDown (.md) support
* App:  Sync, backup and publish websites via desktop / mobile / 3rd party app
* Server-wide search: Search for specific content on all sites within a server, and even on other UCMS servers
* DB support (NOSQL etc)
* Git (repository) driven content management (no database)
* Send and receive email
* Socket chat / IRC
* Third-party CMS integration: Recognize databases from other CMS software like WordPress and Concrete5



#### Project Goals
* De-mystify HTML5 and Web-serving for the End-User
* Free, Easy & SSL-secure Web Hosting for everyone
* Quick-Start server configuration
* Topical MVC - Database / API / client files must exist within the same topic directory
* Maximum server performance with minimal overhead
* Minimal HTML output! Example: [Login Page](https://www.snesology.net/:user/:login)  (46 lines of HTML total)
  * Use as few tags as possible and keep documents small so they render quickly
* Content only! No CMS-specific tags, prefixes, or support libraries on ANY rendered output
* No server admins required - DNS SOA email authorizes administrator
* Create sharable components across different CMS and websites
* Client-side MVC - Render all GUI on the client's browser, never the server
* Universal CMS / CMI: Common SCHEMA that may be shared with other CMS software

#### Client-side Sharable customElements 
* Sharable customElements between websites
* Server determines the client-side dependencies for each customElement based on it's name _automatically_. Examples:
  * [\<user-message>\</user-message>](https://www.snesology.net/:user/:client/message/user-message.element.js) is found at `https://www.snesology.net/:user/:client/message/user-message.element.js`
  * [\<content-nav>\</content-nav>](https://www.snesology.net/:content/:client/nav/content-nav.element.js) is found at `https://www.snesology.net/:content/:client/nav/content-nav.element.js`
* End-user HTML content only needs to contain the customElement tag and the dependencies will be found 
* Encapsulated in a single client-side customElement containing:
  * Model - Requests a copy of the model from the API as it relates to the module
  * View - Renders the client side module responsively based on the model data
  * Controller - Formats and sends the API request and routes the response to the user



#### Help Wanted 
* Javascript/NodeJS Programmer!
* CSS Designer
* Publicist
* Quality Advocate


### Sites Powered by CleverTree CMS
* https://snesology.net/ - Free Digital Audio Workstation based on Super Nintendo Samples
* https://ffga.me/ - Forgotten Future Video Game


# Installation (Stand alone)
```
$ git clone https://github.com/clevertree/cms
$ cd cms
$ npm install
```

### Install CMS MySQL Administrator (Required for multi-domain hosting) 
```
$ sudo mysql
CREATE USER 'cms_user'@'localhost' IDENTIFIED BY 'cms_pass';
GRANT ALL ON *.* TO 'cms_user'@'localhost';
FLUSH PRIVILEGES;
```

### Configure 
```
$ npm run configure
```

### Run Server
```
$ npm start
```



# Installation (as Middleware)
```
$ npm i clevertree-cms -s
```

### Use as middleware in your express server app
```
// Example: myapp.js
const express = require('express');
const clevertree = require('clevertree-cms');


// Create Express
const app = express();


// Add Your App
app.use(express.static(__dirname));


// CMS Config
const config = {
    database: {
        host: 'localhost',
        user: 'cms_user',
        password: 'cms_pass',
        database: 'afoh_info_cms'
    },
    server: {
        httpPort: 8080,
        sslEnable: false
        // sslPort: 8443,
    },
    mail: {
        client: {
            auth: {
                // user: "mail@server.com",
                // pass: "mailmail"
            }
            // host: "mail.server.com",
            // port: 587
        }
    },
    session: {
        secret: "my-random-string-6d4b-48c8-9b3d-9c6bfd506057"
    }
};

// Add CMS middleware
app.use(clevertreeCMS.getMiddleware(config));

// Launch your server
app.listen(config.server.httpPort, function() {
    console.log('Example app listening on port: ' + config.server.httpPort);
});

```

### Run Server
```
$ node myapp.js
```
