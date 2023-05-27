import { respondWith200, respondWith500 } from "../_helpers/http-responses";
import { executeQuery } from "../_helpers/query-helpers";

declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');

// Make sure only 'admin' users have access
router.use(userCheckers.assertIsAdmin);

// List routes here
router.get('/pax_nights_by_location', (req, res) => {
    let queryString = ''
        + 'SELECT p1.location, y.id as `year_id`, l.lat, l.lng, sum(td.pax) as `pax_nights` '
        + 'FROM tours t '
        + 'INNER JOIN tour_days td '
        + 'ON t.id = td.tour_id '
        + 'INNER JOIN programs pr '
        + 'ON t.program_id = pr.idprogram '
        + 'INNER JOIN years y '
        + 'ON pr.id_year = y.id '
        + 'INNER JOIN program_days pd '
        + 'ON pr.idprogram = pd.idprogram and td.day_number = pd.number '
        + 'INNER JOIN points p1 '
        + 'ON pd.idprogram = p1.idprogram and pd.number = p1.daynumber '
        + 'INNER JOIN locations l '
        + 'ON p1.location = l.name '
        + 'WHERE t.status = \'confirmed\' AND td.pax is not null '
        + 'AND p1.idtype IN (\'hotel_checkin\', \'hotel_stay\') '
        + 'AND p1.pointindex = ( '
        + '    SELECT max(pt.pointindex) '
        + '    FROM points pt '
        + '    WHERE pd.idprogram = pt.idprogram and pd.number = pt.daynumber '
        + ') '
        + 'GROUP BY p1.location, y.id '
        + 'ORDER BY `year_id`, `pax_nights` DESC';
    executeQuery(queryString, [], rows => respondWith200(res, rows), err => respondWith500(res, err));
});

// Export router
export {
    router
}