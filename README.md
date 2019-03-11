# Clevertree CMS
Content Management System


## Project Introduction
Clevertree CMS is a **UCMS** (_Universal Content Management System_). 
The primary goal of a UCMS is that **all** of its content is transferable with other UCMS by the *simplest possible interface*.
This is made possible with a common set of APIs (controllers), database table names, fields (models), and content (views). 



### Goals
* Free, Easy & SSL-secure Web Hosting for everyone
* Quick-Start Server Configuration
* Demystify HTML for the End-User
* Create sharable components across different CMS and website software



### What's Currently Working?
* HTML-based content management with historic revisions.
* Upload files and create pages to any path.
* Multi-domain hosting: Host limitless domains on a single node instance. 
* Automatic SSL: Free, automated SSL via greenlock.
* Automatic administration: Request administrator access by setting the domain's SOA email.
* Interactive configuration: No manually editing json files.
* Can be used stand-alone, or as a middleware within another NodeJS app.



### Technical/Code Goals
* Content only! No CMS-specific tags, prefixes, or support libraries on ANY rendered output.
* Maximum server performance with minimal overhead. 
* Micro-MVC: Database / API / client files must exist within the same topic directory.



#### Additional Features
* User services: Add, edit, reset / change password, list, delete.
* Content services: Add, edit, multi-upload, WYSIWYG editor



#### Planned Features
* Content templates
* Send and receive email
* Socket chat / IRC
* Universal CMS / CMI: Simple SCHEMA that may be used by other CMS software without conflicts.
* Third-party CMS integration: Recognize databases from other CMS software like WordPress and Concrete5.
* App:  Sync, backup and publish websites via desktop / mobile / 3rd party app.
* Custom elements:  Create and share custom elements between websites.
* Server-wide search: Search for specific content on all sites within a server, and even on other UCMS servers.
* MarkDown (.md) support



#### Help Wanted
* CSS Theme Designer
* CustomElement Programmer
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