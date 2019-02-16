# Clevertree CMS

## Installation

`$ cd [cms directory]`

`$ npm install`

## (Optional) Install CMS MySQL User

`
$ sudo mysql;
CREATE USER 'cms_user'@'localhost' IDENTIFIED BY 'cms_pass';
GRANT ALL ON *.* TO 'cms_user'@'localhost';
FLUSH PRIVILEGES;
`

## Run Local Server

`$ node start`



## Project Introduction


### Project Goals