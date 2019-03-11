# Clevertree Content Management System


## Project Introduction

Clevertree CMS is a `UCMS` (Universal Content Management System). 
The primary goal of a UCMS is that `all` of its content is transferable with other UCMS by the `simplest possible interface`.
This is made possible with a common set of APIs (controllers), database table names, fields (models), and of course content (views). 


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
* Maximum server performance with minimal overhead. Avoids caching.
* Serve unlimited domains on a single app instance, or multithread.
* Micro-MVC: Database / API / client files must exist within the same topic directory.

#### Additional Features
* User services: Add, edit, reset / change password, list, delete, message.
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

## Installation (Stand alone)
```
$ git clone https://github.com/clevertree/cms
$ cd cms;
$ npm install
```

### Install CMS MySQL Administrator (Required for multi-domain hosting) 
```
$ sudo mysql;
CREATE USER 'cms_user'@'localhost' IDENTIFIED BY 'cms_pass';
GRANT ALL ON *.* TO 'cms_user'@'localhost';
FLUSH PRIVILEGES;
```

### Configure 
```
$ node configure
```

### Run Server
```
$ node start
```
