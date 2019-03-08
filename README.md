# Clevertree CMS


## Project Introduction



### Primary Goals

* HTML-based Content Management with Historic Revisions
* Upload files and create pages to any path
* Multi-domain hosting - Host limitless domains on a single node instance. 
* Automatic SSL - Free, automated SSL via greenlock
* Automatic Admin - Request administration access via DNS SOA Email
* Custom Elements - Create and share custom elements between websites
* Interactive configuration - No manually editing json files

### Secondary Goals

* Universal CMS / CMI - Simple SCHEMA that may be used by other CMS software without conflicts
* Third Party CMS Integration - Recognize databases from other CMS software like WordPress and Concrete5
* App - Sync, Backup and Publish Websites via Desktop/Mobile App

### Technical/Code Goals
* Maximum server performance with minimal overhead 
* Serve unlimited domains on a single app instance
* Content only! No CMS-specific tags, prefixes, or support libraries required on any rendered output
* Micro-MVC - Database/API/Client files must exist within the same topic directory




## Coming Soon
* Content Templates



## Installation

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
