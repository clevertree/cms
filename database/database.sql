# SET foreign_key_checks = 0;

CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(256) NOT NULL,
  `username` varchar(256) NOT NULL,
  `password` varchar(256) DEFAULT NULL,
  `profile` JSON DEFAULT NULL,
  `created` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `flags` SET('guest', 'admin'),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



CREATE TABLE IF NOT EXISTS `theme` (
   `id` int(11) NOT NULL AUTO_INCREMENT,
   `name` varchar(256) DEFAULT NULL,
   `title` varchar(256) DEFAULT NULL,
   `created` datetime DEFAULT current_timestamp(),
   `updated` datetime DEFAULT current_timestamp(),
   PRIMARY KEY (`id`),
   UNIQUE KEY `uk:theme.name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=404 DEFAULT CHARSET=utf8;


INSERT INTO `theme` (`id`, `name`, `title`) VALUES
(1, 'default', 'Default Theme'),
(2, 'blank', 'Blank Theme');


CREATE TABLE IF NOT EXISTS `article` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `theme_id` int(11) DEFAULT NULL,
  `path` varchar(256) DEFAULT NULL,
  `title` varchar(256) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `data` JSON DEFAULT NULL,
  `status` SET('published') DEFAULT '',
  `created` datetime DEFAULT current_timestamp(),
  `updated` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk:article.path` (`path`),
  KEY `fk:article.user_id` (`user_id`),
  CONSTRAINT `fk:article.user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk:article.theme_id` FOREIGN KEY (`theme_id`) REFERENCES `theme` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=404 DEFAULT CHARSET=utf8;


INSERT INTO `article` (`id`, `path`, `title`, `content`) VALUES
(1, '/', 'Home', '<%- include("article/home.ejs")%>');

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

