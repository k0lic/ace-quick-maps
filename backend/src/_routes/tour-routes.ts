import { respondWith200, respondWith500 } from "../_helpers/http-responses";
import { executeQuery } from "../_helpers/query-helpers";

declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let dateHelpers = require('../_helpers/date-helpers');

// Make sure only users have access
router.use(userCheckers.assertIsUser);

// List routes here
router.post('/date_tour_info_confirmed', (req, res) => {
    let date = new Date(req.body.date);
    getTourInfoForDate(date, ['confirmed', 'unknown'], res);
});

function getTourInfoForDate(date, statusValues, res) {
    let queryString = ''
        + 'SELECT p.name as program, t.depart_num as depart, t.excel_row_number as excel_row, t.status as \'status\', '
        + '    t.start_date as start_date, t.end_date as end_date, '
        + '    d.date as \'date\', d.hotel1 as hotel1, d.hotel2 as hotel2, d.tour_lead1 as tour_lead1, d.tour_lead2 as tour_lead2, '
        + '    d.pax_raw as guests, d.room_single as room_single, d.room_double as room_double, d.room_twin as room_twin, '
        + '    d.room_triple as room_triple, d.room_apt as room_apt, d.room_staff as room_staff, '
        + '    a.description as activities, po.pointindex as point_index, po.location as location, po.idtype as point_type, '
        + '    l.lat as lat, l.lng as lng, po.lat as ff_lat, po.lng as ff_lng, p.preferred_ui_color as color, '
        + '    dl.excel_row_number as driving_log_excel_row_number, '
        + '    dl.vehicle1 as vehicle1, dl.vehicle2 as vehicle2, dl.vehicle3 as vehicle3, '
        + '    dl.driver1 as driver1, dl.driver2 as driver2, dl.driver3 as driver3, '
        + '    dl.carrier1 as carrier1, dl.carrier2 as carrier2, dl.carrier3 as carrier3, '
        + '    dl.type1 as type1, dl.type2 as type2, dl.type3 as type3, '
        + '    dl.notice as driving_log_notice '
        + 'FROM tour_days d '
        + 'INNER JOIN tours t '
        + 'ON d.tour_id = t.id '
        + 'INNER JOIN programs p '
        + 'ON t.program_id = p.idprogram '
        + 'LEFT JOIN activities a '
        + 'ON d.id = a.tour_day_id '
        + 'LEFT JOIN points po '
        + 'ON t.program_id = po.idprogram AND datediff(d.date, t.start_date) + 1 = po.daynumber '
        + 'LEFT JOIN locations l '
        + 'ON po.location = l.name '
        + 'LEFT JOIN tour_days_driving_log dl '
        + 'ON d.tour_id = dl.tour_id AND d.date = dl.date '
        + 'WHERE d.date = ? AND t.status in ?';
    let queryValues = [dateHelpers.getYYYYMMDDdashed(date), [statusValues]];

    executeQuery(queryString, queryValues, rows => respondWith200(res, rows), err => respondWith500(res, err));
}

// Export router
export {
    router
}