DROP SCHEMA `afoh`;
CREATE SCHEMA IF NOT EXISTS `afoh`;
USE `afoh`;


# SET foreign_key_checks = 0;

CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(256) DEFAULT NULL,
  `password` varchar(256) DEFAULT NULL,
  `profile` TEXT,
  `flags` SET('guest', 'admin'),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `user` (`id`, `email`, `flags`)
  VALUES (1, 'guest@localhost', 'guest');




CREATE TABLE `article` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `path` varchar(256),
  `title` varchar(256) DEFAULT NULL,
  `content` TEXT,
  `theme` varchar(256) DEFAULT NULL,
  `flags` SET('account-only', 'admin-only'),
  `created` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `article_path_unique` (`path`),
  CONSTRAINT `fk:article.user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `article` (id, parent_id, title, path, content)
  VALUES  (1, null,   'Home',                 '/',          '<%- include("about.ejs") %>'),
          (2, null,   'About Us',             '/about',     '<%- include("about.ejs") %>'),
          (3, 1,      'What We Do',           '/service',   '<%- include("about.ejs") %>');




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


#



#
#           (101, null,   'Homeless Resources',   '/resources',     'main-menu', '<%- include("about.ejs") %>'),
#           (102, 101,     'AFOH FAQ',                                 NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (103, 101,     'Homelessness and Crisis Directories',      NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (104, 101,     'Groups, Outreach, and Organizations',      NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (105, 101,     'Foodbanks, Kitchens, Medical, and Other',  NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (106, 101,     'Shelter and Housing Directories',          NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (107, 101,     'Women\'s, Youth, and Domestic Violence',   NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (108, 101,     'Pregnant, Post-partum, and Family',        NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (109, 101,     'Single Men\'s Shelter, and Housing',       NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#
#           (201, null,  'AFOH Outreach / Projects',   NULL, 'main-menu', '<%- include("about.ejs") %>'),
#           (202, 201,    'AFOH Central Phoenix',            NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (203, 201,    'AFOH Chavez Park',                NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (204, 201,    'AFOH Motor Home Project',         NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#           (205, 201,    'AFOH Wash Morning @ Social Spin', NULL, 'sub-menu', '<%- include("about.ejs") %>'),
#
#           (301, null,  'Contribute / Volunteer',   '/contribute',     'main-menu', '<%- include("about.ejs") %>'),
#           (302, 301,    'Donate!',                  '/contribute-donate',   'sub-menu', '<%- include("about.ejs") %>'),
#           (303, 301,    'Volunteer!',               '/contribute-volunteer',   'sub-menu', '<%- include("about.ejs") %>'),
#           (304, 301,    'Amazon Wishlist',          '/contribute-amazon',   'sub-menu', '<%- include("about.ejs") %>'),
#
#           (401, null,  'Contact Us',   '/contact',     'main-menu', '<%- include("about.ejs") %>'),
#           (402, 401,    'Facebook',     '/contact-facebook',   'sub-menu', '<%- include("about.ejs") %>'),
#           (403, 401,    'E-mail',       '/contact-email',   'sub-menu', '<%- include("about.ejs") %>'),

#           (1001, null,  'Account',   '/account',     '', '<%- include("section/user.ejs") %>'),
#           (1002, null,  'Register',   '/register',     '', '<%- include("section/register.ejs") %>'),
#           (1003, 1001,  'Log out',   '/logout',     '', '<%- include("section/logout.ejs") %>'),
#           (1004, 1001,  'Log in',   '/login',     '', '<%- include("section/login.ejs") %>');

CREATE USER IF NOT EXISTS 'afoh'@'localhost';
GRANT ALL ON afoh.* TO 'afoh'@'localhost';