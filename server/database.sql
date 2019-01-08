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
  `parent_id` int(11) DEFAULT NULL,
  `path` varchar(256),
  `title` varchar(256) DEFAULT NULL,
  `theme` varchar(256) DEFAULT NULL,
  `flag` SET('main-menu', 'sub-menu', 'account-only', 'admin-only'),
  `content` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `article_path_unique` (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `article` (id, parent_id, title, path, flag)
  VALUES  (1, null,   'Home',                 '/',          'main-menu'),
          (2, null,   'About Us',             '/about',     'sub-menu'),
          (3, 1,      'What We Do',           '/service',   'sub-menu'),

          (101, null,   'Homeless Resources',   '/resources',     'main-menu'),
          (102, 101,     'AFOH FAQ',                                 NULL, 'sub-menu'),
          (103, 101,     'Homelessness and Crisis Directories',      NULL, 'sub-menu'),
          (104, 101,     'Groups, Outreach, and Organizations',      NULL, 'sub-menu'),
          (105, 101,     'Foodbanks, Kitchens, Medical, and Other',  NULL, 'sub-menu'),
          (106, 101,     'Shelter and Housing Directories',          NULL, 'sub-menu'),
          (107, 101,     'Women\'s, Youth, and Domestic Violence',   NULL, 'sub-menu'),
          (108, 101,     'Pregnant, Post-partum, and Family',        NULL, 'sub-menu'),
          (109, 101,     'Single Men\'s Shelter, and Housing',       NULL, 'sub-menu'),

          (201, null,  'AFOH Outreach / Projects',   NULL, 'main-menu'),
          (202, 201,    'AFOH Central Phoenix',            NULL, 'sub-menu'),
          (203, 201,    'AFOH Chavez Park',                NULL, 'sub-menu'),
          (204, 201,    'AFOH Motor Home Project',         NULL, 'sub-menu'),
          (205, 201,    'AFOH Wash Morning @ Social Spin', NULL, 'sub-menu'),

          (301, null,  'Contribute / Volunteer',   '/contribute',     'main-menu'),
          (302, 301,    'Donate!',                  '/contribute-donate',   'sub-menu'),
          (303, 301,    'Volunteer!',               '/contribute-volunteer',   'sub-menu'),
          (304, 301,    'Amazon Wishlist',          '/contribute-amazon',   'sub-menu'),

          (401, null,  'Contact Us',   '/contact',     'main-menu'),
          (402, 401,    'Facebook',     '/contact-facebook',   'sub-menu'),
          (403, 401,    'E-mail',       '/contact-email',   'sub-menu');



CREATE USER IF NOT EXISTS 'afoh'@'localhost';
GRANT ALL ON afoh.* TO 'afoh'@'localhost';