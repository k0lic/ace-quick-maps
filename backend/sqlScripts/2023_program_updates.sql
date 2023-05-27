UPDATE programs
SET name = 'MCG1'
WHERE name='MCG 1' and id_year=2;

UPDATE programs
SET name = 'MCG2'
WHERE name='MCG 2' and id_year=2;

INSERT INTO `quick_maps`.`programs`
(`name`, `idpartner`, `preferred_ui_color`, `id_year`, `id_ace_firm`)
VALUES
('GRP216', 4, '#51648D', 2, 3),
('MTGS24', 4, '#95B3D7', 2, 3),
('AT', 13, '#C00000', 2, 1),
('OCD', 13, '#E26B0A', 2, 1),
('MTGS23', 4, '#FABF8F', 2, 3),
('BNA', 9, '#808000', 2, 3),
('PB', 9, '#FF00FF', 2, 3),
('DBR', 14, '#00FFFF', 2, 3),
('BC', 9, '#963634', 2, 3),
('HDI', 7, '#538DD5', 2, 3),
('BCB', 7, '#800080', 2, 3),
('MTGS27', 4, '#9BBB59', 2, 3),
('SBS', 9, '#60497A', 2, 3),
('CROL01', 4, '#9FE6FF', 2, 3),
('BNA2', 9, '#C1BF7F', 2, 3);