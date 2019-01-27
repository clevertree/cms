DROP SCHEMA IF EXISTS `afoh`;
CREATE SCHEMA IF NOT EXISTS `afoh`;
USE `afoh`;


# SET foreign_key_checks = 0;

CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(256) NOT NULL,
  `password` varchar(256) DEFAULT NULL,
  `profile` JSON DEFAULT NULL,
  `created` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `flags` SET('guest', 'admin'),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `user` (`id`, `email`, `password`, `profile`, `flags`) VALUES
(1, 'guest@localhost', NULL, NULL, 'guest'),
(2, 'admin@afoh.info', '$2a$10$z/q611pNv/WSgAIntOQ6Meow8d6QDZW73MlDKiEJ/5KPI3jAzZ912', '{"name":"Ari R Asulin","description":"g ssgffet &lt;br>omg &lt;hr>"}', 'admin'),
(5, 'ktkinkel@gmail.com', '$2a$10$9rknzN/XYtGJpyELSnA/3.2TEniFIlMDFsT4oNg3JceJV04crc6rm', NULL, 'admin'),
(6, 'ari.asulin@gmail.com', '$2a$10$TAG1S.apbF2rr1nKstYj5.n1caQ1Wj2q188sw2QCcLrAIs9K9vK3K', NULL, 'admin');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;

CREATE TABLE `user_session` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `uuid` varchar(256) NOT NULL,
  `password` varchar(256) NOT NULL,
  `created` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('reset', 'active', 'inactive') NOT NULL,
  `session` JSON,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk:user_session.uuid` (`uuid`),
  CONSTRAINT `fk:user.user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;




CREATE TABLE IF NOT EXISTS `article` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `path` varchar(256) DEFAULT NULL,
  `title` varchar(256) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `theme` varchar(256) DEFAULT NULL,
  `data` JSON DEFAULT NULL,
  `status` ENUM('draft', 'published') DEFAULT 'draft',
  `created` datetime DEFAULT current_timestamp(),
  `updated` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk:article.path` (`path`),
  KEY `fk:article.user_id` (`user_id`),
  CONSTRAINT `fk:article.user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=404 DEFAULT CHARSET=utf8;


CREATE TABLE `article_revision` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `article_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(256) DEFAULT NULL,
  `content` TEXT,
  `created` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx:article_revision.article_id` (`article_id` ASC),
  KEY `idx:article_revision.user_id` (`user_id` ASC),

  CONSTRAINT `fk:article_revision.article_id` FOREIGN KEY (`article_id`) REFERENCES `article` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk:article_revision.user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `file` (
   `id` int(11) NOT NULL AUTO_INCREMENT,
   `user_id` int(11) DEFAULT NULL,
   `title` varchar(128) DEFAULT NULL,
   `path` varchar(256) NOT NULL,
   `hash` varchar(256) NOT NULL,
   `size` BIGINT(11) DEFAULT NULL,
   `content` MEDIUMBLOB,
   `created` DATETIME DEFAULT CURRENT_TIMESTAMP,
   `updated` DATETIME DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (`id`),
   UNIQUE KEY `uk:file.path` (`path`),
   UNIQUE KEY `uk:file.hash` (`hash`),
   CONSTRAINT `fk:file.user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



CREATE USER IF NOT EXISTS 'afoh'@'localhost';
GRANT ALL ON afoh.* TO 'afoh'@'localhost';