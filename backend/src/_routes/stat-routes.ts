declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let queryHelpers = require('../_helpers/query-helpers');

// Make sure only 'admin' users have access
router.use(userCheckers.assertIsAdmin);

// List routes here
router.get('/pax_nights_by_location', (req, res) => {
    let queryString = ''
        + 'SELECT p1.location, l.lat, l.lng, sum(t.guest_number * (p2.daynumber - p1.daynumber)) as `pax_nights` '
        + 'FROM tours t '
        + 'INNER JOIN programs pr '
        + 'ON t.program_id = pr.idprogram '
        + 'INNER JOIN points p1 '
        + 'ON t.program_id = p1.idprogram '
        + 'INNER JOIN locations l '
        + 'ON p1.location = l.name '
        + 'INNER JOIN points p2 '
        + 'ON t.program_id = p2.idprogram '
        + 'WHERE t.status = \'confirmed\' AND t.guest_number is not null '
        + 'AND p1.idtype = \'hotel_checkin\' AND p1.location = p2.location AND p2.idtype = \'hotel_checkout\' '
        + 'AND p2.daynumber = ( '
        + '    SELECT min(psub.daynumber) '
        + '    FROM points psub '
        + '    WHERE psub.idprogram = t.program_id AND psub.location = p1.location AND psub.idtype = \'hotel_checkout\' AND psub.daynumber > p1.daynumber '
        + ') '
        + 'GROUP BY p1.location '
        + 'ORDER BY `pax_nights` DESC';
    queryHelpers.executeQuery(queryString, [], res);
});

// Export router
export {
    router
}