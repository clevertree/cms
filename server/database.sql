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
  `flag` SET('main-menu', 'sub-menu'),
  `content` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `article_path_unique` (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `article` (id, parent_id, title, path, content, flag)
  VALUES  (1, null,   'Home',                 '/',          '<%- include("template/home.ejs") %>', 'main-menu'),
          (2, null,   'About Us',             '/about',     '<%- include("template/about.ejs") %>', 'sub-menu'),
          (3, 1,      'What We Do',           '/service',   '<%- include("template/about.ejs") %>', 'sub-menu'),

          (101, null,   'Homeless Resources',   '/resources',     '<%- include("template/about.ejs") %>', 'main-menu'),
          (102, 101,      'AFOH FAQ',                                 NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (103, 101,      'Homelessness and Crisis Directories',      NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (104, 101,      'Groups, Outreach, and Organizations',      NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (105, 101,      'Foodbanks, Kitchens, Medical, and Other',  NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (106, 101,      'Shelter and Housing Directories',          NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (107, 101,     'Women\'s, Youth, and Domestic Violence',   NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (108, 101,     'Pregnant, Post-partum, and Family',        NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (109, 101,     'Single Men\'s Shelter, and Housing',       NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),

          (201, null,  'AFOH Outreach / Projects',   '/projects',     '<%- include("template/about.ejs") %>', 'main-menu'),
          (202, 201,    'AFOH Central Phoenix',            NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (203, 201,    'AFOH Chavez Park',                NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (204, 201,    'AFOH Motor Home Project',         NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (205, 201,    'AFOH Wash Morning @ Social Spin', NULL,   '<%- include("template/about.ejs") %>', 'sub-menu'),

          (301, null,  'Contribute / Volunteer',   '/contribute',     '<%- include("template/about.ejs") %>', 'main-menu'),
          (302, 301,    'Donate!',                  '/contribute-donate',   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (303, 301,    'Volunteer!',               '/contribute-volunteer',   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (304, 301,    'Amazon Wishlist',          '/contribute-amazon',   '<%- include("template/about.ejs") %>', 'sub-menu'),

          (401, null,  'Contact Us',   '/contact',     '<%- include("template/about.ejs") %>', 'main-menu'),
          (402, 401,    'Facebook',     '/contact-facebook',   '<%- include("template/about.ejs") %>', 'sub-menu'),
          (403, 401,    'E-mail',       '/contact-email',   '<%- include("template/about.ejs") %>', 'sub-menu');


CREATE USER IF NOT EXISTS 'afoh'@'localhost';
GRANT ALL ON afoh.* TO 'afoh'@'localhost';