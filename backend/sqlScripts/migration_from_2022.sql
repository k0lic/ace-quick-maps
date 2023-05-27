CREATE TABLE `quick_maps`.`years` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `value` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id`));
  
INSERT INTO `quick_maps`.`years` (`value`) VALUES ('2022');
INSERT INTO `quick_maps`.`years` (`value`) VALUES ('2023');
INSERT INTO `quick_maps`.`years` (`value`) VALUES ('2024');

CREATE TABLE `quick_maps`.`ace_firms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id`));
  
INSERT INTO `quick_maps`.`ace_firms` (`name`) VALUES ('ACE CENTRE');
INSERT INTO `quick_maps`.`ace_firms` (`name`) VALUES ('ACE MNE');
INSERT INTO `quick_maps`.`ace_firms` (`name`) VALUES ('ACE SER');
INSERT INTO `quick_maps`.`ace_firms` (`name`) VALUES ('PBK');

ALTER TABLE `quick_maps`.`programs` 
ADD COLUMN `id_year` INT NOT NULL DEFAULT 1 AFTER `preferred_ui_color`,
ADD COLUMN `id_ace_firm` INT NOT NULL DEFAULT 1 AFTER `id_year`;
;
ALTER TABLE `quick_maps`.`programs` 
ADD CONSTRAINT `FK_year`
  FOREIGN KEY (`id_year`)
  REFERENCES `quick_maps`.`years` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE,
ADD CONSTRAINT `FK_ace_firm`
  FOREIGN KEY (`id_ace_firm`)
  REFERENCES `quick_maps`.`ace_firms` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
  ALTER TABLE `quick_maps`.`programs` 
DROP FOREIGN KEY `FK_ace_firm`,
DROP FOREIGN KEY `FK_year`;
ALTER TABLE `quick_maps`.`programs` 
CHANGE COLUMN `id_year` `id_year` INT(11) NOT NULL ,
CHANGE COLUMN `id_ace_firm` `id_ace_firm` INT(11) NOT NULL ;
ALTER TABLE `quick_maps`.`programs` 
ADD CONSTRAINT `FK_ace_firm`
  FOREIGN KEY (`id_ace_firm`)
  REFERENCES `quick_maps`.`ace_firms` (`id`)
  ON UPDATE CASCADE,
ADD CONSTRAINT `FK_year`
  FOREIGN KEY (`id_year`)
  REFERENCES `quick_maps`.`years` (`id`)
  ON UPDATE CASCADE;

UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '1');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '5');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '6');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '7');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '8');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '49');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '48');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '54');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '2');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '3');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '50');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '4');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '2' WHERE (`idprogram` = '51');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '35');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '12');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '13');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '14');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '16');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '20');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '40');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '38');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '36');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '19');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '21');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '10');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '43');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '15');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '53');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '44');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '45');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '23');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '46');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '62');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '4' WHERE (`idprogram` = '25');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '4' WHERE (`idprogram` = '29');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '4' WHERE (`idprogram` = '26');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '4' WHERE (`idprogram` = '27');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '4' WHERE (`idprogram` = '28');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '22');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '24');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '33');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '34');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '41');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '47');
UPDATE `quick_maps`.`programs` SET `id_ace_firm` = '3' WHERE (`idprogram` = '64');

DELETE FROM quick_maps.tour_days;
DELETE FROM quick_maps.tour_days_driving_log;
DELETE FROM quick_maps.tours;

ALTER TABLE `quick_maps`.`tours` 
DROP COLUMN `guests_raw`,
DROP COLUMN `guest_number`,
DROP COLUMN `tour_guide`;

ALTER TABLE `quick_maps`.`tour_days` 
ADD COLUMN `pax` INT NULL DEFAULT NULL AFTER `hotel2`,
ADD COLUMN `pax_raw` VARCHAR(64) NULL DEFAULT NULL AFTER `pax`,
ADD COLUMN `room_single` INT NULL DEFAULT NULL AFTER `pax_raw`,
ADD COLUMN `room_double` INT NULL DEFAULT NULL AFTER `room_single`,
ADD COLUMN `room_twin` INT NULL DEFAULT NULL AFTER `room_double`,
ADD COLUMN `room_triple` INT NULL DEFAULT NULL AFTER `room_twin`,
ADD COLUMN `room_apt` INT NULL DEFAULT NULL AFTER `room_triple`,
ADD COLUMN `room_staff` VARCHAR(64) NULL DEFAULT NULL AFTER `room_apt`,
ADD COLUMN `tour_lead1` VARCHAR(64) NULL DEFAULT NULL AFTER `room_staff`,
ADD COLUMN `tour_lead2` VARCHAR(64) NULL DEFAULT NULL AFTER `tour_lead1`,
ADD COLUMN `dump` VARCHAR(256) NULL DEFAULT NULL AFTER `tour_lead2`;

ALTER TABLE `quick_maps`.`tour_days_driving_log` 
ADD COLUMN `driver1` VARCHAR(64) NULL DEFAULT NULL AFTER `vehicle1`,
ADD COLUMN `driver2` VARCHAR(64) NULL DEFAULT NULL AFTER `vehicle2`,
ADD COLUMN `driver3` VARCHAR(64) NULL DEFAULT NULL AFTER `vehicle3`,
ADD COLUMN `carrier1` VARCHAR(64) NULL DEFAULT NULL AFTER `driver3`,
ADD COLUMN `type1` VARCHAR(64) NULL DEFAULT NULL AFTER `carrier1`,
ADD COLUMN `carrier2` VARCHAR(64) NULL DEFAULT NULL AFTER `type1`,
ADD COLUMN `type2` VARCHAR(64) NULL DEFAULT NULL AFTER `carrier2`,
ADD COLUMN `carrier3` VARCHAR(64) NULL DEFAULT NULL AFTER `type2`,
ADD COLUMN `type3` VARCHAR(64) NULL DEFAULT NULL AFTER `carrier3`;

CREATE TABLE `quick_maps`.`current_year` (
  `current` INT NOT NULL,
  PRIMARY KEY (`current`));
ALTER TABLE `quick_maps`.`current_year` 
ADD CONSTRAINT `FK_current_to_year`
  FOREIGN KEY (`current`)
  REFERENCES `quick_maps`.`years` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
  
INSERT INTO `quick_maps`.`current_year` (`current`) VALUES ('2');

