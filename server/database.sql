DROP SCHEMA `afoh`;
CREATE SCHEMA IF NOT EXISTS `afoh`;
USE `afoh`;


SET foreign_key_checks = 0;

CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(256) DEFAULT NULL,
  `password` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

SET foreign_key_checks = 1;


CREATE USER 'afoh'@'localhost';
GRANT ALL ON afoh.* TO 'afoh'@'localhost';