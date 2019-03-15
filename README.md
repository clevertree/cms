# Clevertree CMS
Content Management System


## Project Introduction
Clevertree CMS is a light-weight and high performance **UCMS** (_Universal Content Management System_)
with a primary goal for **all** of its content is transferable with other UCMS by the *simplest possible interface*.


#### Perquisites
* nodejs
* MySQL/MariaDB Server



#### What's Currently Working?
* Easy interactive configuration
* HTML-based content management with historic revisions
* Upload files and create pages to any path
* Host unlimited domains on a single node instance
* Free, automated SSL via greenlock
* Request administrator access by setting the domain's SOA email
* Can be used stand-alone, or as a middleware within another NodeJS app
* CMS API middleware can be enabled individually (example: content management @ /:content/ with no user management @ /:user/)
* User services: Add, edit, reset / change password, list, delete
* Content services: Add, edit, multi-upload, delete, WYSIWYG editor



#### Planned Features
* Content templates
* MarkDown (.md) support
* App:  Sync, backup and publish websites via desktop / mobile / 3rd party app
* Server-wide search: Search for specific content on all sites within a server, and even on other UCMS servers
* DB support (NOSQL etc)
* Git-driven content management (no database)
* Send and receive email
* Socket chat / IRC
* Third-party CMS integration: Recognize databases from other CMS software like WordPress and Concrete5



#### Goals
* Free, Easy & SSL-secure Web Hosting for everyone
* Quick-Start Server Configuration
* Demystify HTML for the End-User
* Create sharable components across different CMS and website software
* Client-side MVC - Render all GUI on the client's browser, never the server
* Content only! No CMS-specific tags, prefixes, or support libraries on ANY rendered output
* Minimal HTML output - use as few tags as possible and keep documents small so they render quickly
* Maximum server performance with minimal overhead
* Micro-MVC - Database / API / client files must exist within the same topic directory
* No server admins required - DNS SOA email authorizes administrator
* Extremely small HTML output! Check out the source for `view-source:https://www.afoh.info/:user/:login`
* Universal CMS / CMI: Simple SCHEMA that may be used by other CMS software without conflicts



#### Client-side MVC Module Design 
* Sharable customElements between websites
* Server determines the client-side dependencies for each module based on it's name _automatically_
  * Example: content-form-browser.element.js is found at [/:content/:client/form/content-form-browser.element.js]
  * HTML content only needs to contain the custom element tag and the dependencies will be found 
* Encapsulated in a single client-side customElement containing:
  * Model - Requests a copy of the model from the API as it relates to the module
  * View - Renders the client side module responsively based on the model data
  * Controller - Formats and sends the API request and routes the response to the user



#### Help Wanted 
* Javascript/NodeJS Programmer!
* CSS Designer
* Publicist



### Sites Powered by CleverTree CMS
* https://afoh.info - Arizona Friends of Homeless 



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
const { HTTPServer } = require('clevertree-cms');

// Create Express
const app = express();

// Add Your App
app.use(express.static(__dirname));

// Add CMS middleware
app.use(HTTPServer.getMiddleware());

// Launch server
const httpPort = 8080;
require('http').createServer(app).listen(httpPort, () => {
    console.log(`HTTP listening on port ${httpPort}`);
});

```

### Run Server
```
$ node myapp.js
```
