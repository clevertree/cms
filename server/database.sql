DROP SCHEMA `afoh`;
CREATE SCHEMA IF NOT EXISTS `afoh`;
USE `afoh`;


# SET foreign_key_checks = 0;

CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(256) DEFAULT NULL,
  `password` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE `article` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `path` varchar(256),
  `content` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `article_path_unique` (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `article` SET path = '/', content = '<%- include("template/home.ejs") %>';
INSERT INTO `article` SET path = '/about', content = '<%- include("index.ejs") %>';

# SET foreign_key_checks = 1;


CREATE USER 'afoh'@'localhost';
GRANT ALL ON afoh.* TO 'afoh'@'localhost';