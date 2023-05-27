INSERT INTO `quick_maps`.`programs`
(`name`,
`idpartner`,
`preferred_ui_color`,
`id_year`,
`id_ace_firm`)
	SELECT p.name, p.idpartner, p.preferred_ui_color, (
		select id 
        from `quick_maps`.`years` as y 
        where y.value = '2023'
	) as 'id_year', p.id_ace_firm
    FROM `quick_maps`.`programs` as p
    WHERE p.id_year = (
		select id 
        from `quick_maps`.`years` as y 
        where y.value = '2022'
	);

INSERT INTO `quick_maps`.`program_days`
(`idprogram`,
`number`,
`description`)
	SELECT b.idprogram, pd.number, pd.description
	FROM `quick_maps`.`programs` a, `quick_maps`.`programs` b, `quick_maps`.`program_days` pd
	WHERE a.id_year = (
			select id 
			from `quick_maps`.`years` as y 
			where y.value = '2022'
		) and b.id_year = (
			select id 
			from `quick_maps`.`years` as y 
			where y.value = '2023'
		) and a.name = b.name and a.idpartner = b.idpartner and a.id_ace_firm = b.id_ace_firm
        and pd.idprogram = a.idprogram;

INSERT INTO `quick_maps`.`points`
(`idprogram`,
`daynumber`,
`pointindex`,
`location`,
`lat`,
`lng`,
`idtype`,
`description`)
	SELECT b.idprogram, pts.daynumber, pts.pointindex, pts.location, pts.lat, pts.lng, pts.idtype, pts.description
	FROM `quick_maps`.`programs` a, `quick_maps`.`programs` b, `quick_maps`.`program_days` pd, `quick_maps`.`points` pts
	WHERE a.id_year = (
			select id 
			from `quick_maps`.`years` as y 
			where y.value = '2022'
		) and b.id_year = (
			select id 
			from `quick_maps`.`years` as y 
			where y.value = '2023'
		) and a.name = b.name and a.idpartner = b.idpartner and a.id_ace_firm = b.id_ace_firm
        and pd.idprogram = a.idprogram
        and pts.idprogram = pd.idprogram and pts.daynumber = pd.number;

