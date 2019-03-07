# Clevertree CMS


## Project Introduction



#### Primary Goals

* Simple HTML-based Content Management with Historic Revisions
* Upload files and create pages to any path
* Multi-domain hosting - Host limitless domains on a single node instance. 
* Automatic SSL - Free, automated SSL via Greenlock
* Automatic Admin - Request administration access via DNS SOA Email
* Maximum server performance with minimal overhead

#### Secondary Goals

* Universal CMS / CMI - Simple SCHEMA that may be used by other CMS software without conflicts
* Third Party CMS Integration - Recognize databases from other CMS software like WordPress and Concrete5
* App - Sync, Backup and Publish Websites via Desktop/Mobile App



## Installation

```
$ cd [cms directory]
$ npm install
```
## (Optional) Install CMS MySQL User

```
$ sudo mysql;
CREATE USER 'cms_user'@'localhost' IDENTIFIED BY 'cms_pass';
GRANT ALL ON *.* TO 'cms_user'@'localhost';
FLUSH PRIVILEGES;
```

## Run Local Server

```
$ node start
```
