declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let queryHelpers = require('../_helpers/query-helpers');
let stringHelpers = require('../_helpers/string-helpers');
let dateHelpers = require('../_helpers/date-helpers');

// Make sure only users have access
router.use(userCheckers.assertIsUser);

// List routes here
router.post('/date_tour_info_confirmed', (req, res) => {
    let date = new Date(req.body.date);
    getTourInfoForDate(date, ['confirmed'], res);
});

function getTourInfoForDate(date, statusValues, res) {
    // let statusValuesString = '';
    // let firstValue = true;
    // statusValues.forEach(v => {
    //     statusValuesString += (firstValue ? '' : ',') + stringHelpers.quoteMe(v);
    //     firstValue = false;
    // });
    statusValues = [statusValues];

    // let queryString = 'SELECT p.name as program, t.depart_num as depart, t.excel_row_number as excel_row, t.status as \'status\', t.start_date as start_date, t.end_date as end_date, '
    //                 + '     d.date as \'date\', d.hotel1 as hotel1, d.hotel2 as hotel2, t.tour_guide as tour_guide, t.guests_raw as guests, a.description as activities, '
    //                 + '     po.pointindex as point_index, po.location as location, po.idtype as point_type, l.lat as lat, l.lng as lng, po.lat as ff_lat, po.lng as ff_lng, '
    //                 + '     p.preferred_ui_color as color '
    //                 + 'FROM tour_days d '
    //                 + 'INNER JOIN tours t '
    //                 + 'ON d.tour_id = t.id '
    //                 + 'INNER JOIN programs p '
    //                 + 'ON t.program_id = p.idprogram '
    //                 + 'LEFT JOIN activities a '
    //                 + 'ON d.id = a.tour_day_id '
    //                 + 'LEFT JOIN points po '
    //                 + 'ON t.program_id = po.idprogram AND datediff(d.date, t.start_date) + 1 = po.daynumber '
    //                 + 'LEFT JOIN locations l '
    //                 + 'ON po.location = l.name '
    //                 + 'WHERE d.date = ' + stringHelpers.quoteMe(dateHelpers.getYYYYMMDDdashed(date)) + ' AND t.status in (' + statusValuesString + ')';
    let queryString = 'SELECT p.name as program, t.depart_num as depart, t.excel_row_number as excel_row, t.status as \'status\', t.start_date as start_date, t.end_date as end_date, '
                    + '     d.date as \'date\', d.hotel1 as hotel1, d.hotel2 as hotel2, t.tour_guide as tour_guide, t.guests_raw as guests, a.description as activities, '
                    + '     po.pointindex as point_index, po.location as location, po.idtype as point_type, l.lat as lat, l.lng as lng, po.lat as ff_lat, po.lng as ff_lng, '
                    + '     p.preferred_ui_color as color '
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
                    + 'WHERE d.date = ? AND t.status in ?';
    let queryValues = [dateHelpers.getYYYYMMDDdashed(date), statusValues];

    queryHelpers.executeQuery(queryString, queryValues, res);
}

function updateDatabaseWithTours(tours, res): void {
    // TODO: don't just copy these 3 into every function, come on man...
    const statusUnknown = 'unknown';
    const statusConfirmed = 'confirmed';
    const statusCanceled = 'canceled';

    // Excel contains program names, while database uses auto-generated keys for programs
    let allProgramsQuery = 'SELECT * FROM programs';
    queryHelpers.executeQueryWithCallback(allProgramsQuery, [], res, programs => {
        // Create mapping from program name (eg. MCG1) to program id (eg. 31)
        let programNameMap: Map<string, number> = new Map();
        programs.forEach(p => {
            programNameMap.set(p.name, p.idprogram);
        });

        // tour_days and activities are set to Cascade on Delete
        let cleanupQuery = 'DELETE FROM tours';
        
        // let insertToursQueryString = 'INSERT INTO tours (excel_row_number, program_id, start_date, end_date, depart_num, tour_guide, guest_number, guests_raw, status) VALUES ';
        let insertToursQueryString = 'INSERT INTO tours (excel_row_number, program_id, start_date, end_date, depart_num, tour_guide, guest_number, guests_raw, status) VALUES ?';

        let insertTourQueryValues: any[] = [[]];
        // let firstTour = true;
        tours.forEach(t => {
            // insertToursQuery += (firstTour ? '' : ',') + '('
            //     + t.rowNumber + ','
            //     + programNameMap.get(String(t.name)) + ','
            //     + stringHelpers.quoteMe(dateHelpers.getYYYYMMDDdashed(t.startDate)) + ','
            //     + stringHelpers.quoteMe(dateHelpers.getYYYYMMDDdashed(t.endDate)) + ','
            //     + t.departNum + ','
            //     + (t.tourGuide == null ? null : stringHelpers.quoteMe(t.tourGuide)) + ','
            //     + t.guestNum + ','
            //     + (t.guestNumRaw == null ? null : stringHelpers.quoteMe(t.guestNumRaw)) + ','
            //     + stringHelpers.quoteMe(t.status)
            //     + ')';
            // firstTour = false;
            insertTourQueryValues[0].push([
                t.rowNumber,
                programNameMap.get(String(t.name)),
                dateHelpers.getYYYYMMDDdashed(t.startDate),
                dateHelpers.getYYYYMMDDdashed(t.endDate),
                t.departNum,
                t.tourGuide,
                t.guestNum,
                t.guestNumRaw,
                t.status
            ]);
        });

        queryHelpers.beginTransaction(res, () => {
            queryHelpers.executeQueryWithCallback(cleanupQuery, [], res, rows => {
                queryHelpers.executeQueryWithCallback(insertToursQueryString, insertTourQueryValues, res, rows => {
                    let fetchNewToursQuery = 'SELECT * FROM tours ORDER BY excel_row_number';
                    queryHelpers.executeQueryWithCallback(fetchNewToursQuery, [], res, dbTours => {
                        // let insertTourDaysQueryString = 'INSERT INTO tour_days (tour_id, day_number, date, hotel1, hotel2) VALUES ';
                        let insertTourDaysQueryString = 'INSERT INTO tour_days (tour_id, day_number, date, hotel1, hotel2) VALUES ?';

                        let insertTourDaysQueryValues: any[] = [[]];
                        // let firstDay = true;
                        tours.forEach((t, tIndex) => {
                            t.days.forEach(d => {
                                // insertTourDaysQueryString += (firstDay ? '' : ',') + '('
                                //     + dbTours[tIndex].id + ','
                                //     + d.dayNum + ','
                                //     + stringHelpers.quoteMe(dateHelpers.getYYYYMMDDdashed(d.arrDate)) + ','
                                //     + (d.hotel1 == null ? null : stringHelpers.quoteMe(d.hotel1)) + ','
                                //     + (d.hotel2 == null ? null : stringHelpers.quoteMe(d.hotel2))
                                //     + ')';
                                // firstDay = false;
                                insertTourDaysQueryValues[0].push([
                                    dbTours[tIndex].id,
                                    d.dayNum,
                                    dateHelpers.getYYYYMMDDdashed(d.arrDate),
                                    d.hotel1,
                                    d.hotel2
                                ]);
                            });
                        });

                        queryHelpers.executeQueryWithCallback(insertTourDaysQueryString, insertTourDaysQueryValues, res, rows => {
                            let fetchNewTourDaysQuery = 'SELECT * FROM tour_days';
                            queryHelpers.executeQueryWithCallback(fetchNewTourDaysQuery, [], res, dbTourDays => {
                                // let insertActivitiesQueryString = 'INSERT INTO activities (tour_day_id, activity_number, point_index, description) VALUES ';
                                let insertActivitiesQueryString = 'INSERT INTO activities (tour_day_id, activity_number, point_index, description) VALUES ?';

                                let insertActivitiesQueryValues: any[] = [[]];
                                let firstActivity = true;
                                tours.forEach((t, tIndex) => {
                                    let activityNum = 1;
                                    t.days.forEach(d => {
                                        // Check if there's an activity for this day
                                        if (d.activities == null) {
                                            // No activity for this day, skip it
                                            return;
                                        }

                                        let dbDay = dbTourDays.find(day => day.tour_id == dbTours[tIndex].id && day.day_number == d.dayNum);
                                        // insertActivitiesQueryString += (firstActivity ? '' : ',') + '('
                                        //     + dbDay.id + ','
                                        //     + activityNum + ','
                                        //     + null + ','
                                        //     + stringHelpers.quoteMe(d.activities)
                                        //     + ')';
                                        insertActivitiesQueryValues[0].push([
                                            dbDay.id,
                                            activityNum,
                                            null,
                                            d.activities
                                        ]);
                                        activityNum++;
                                        firstActivity = false;
                                    });
                                });

                                // Only execute query if there are activities to add
                                if (!firstActivity) {
                                    queryHelpers.executeQueryWithCallback(insertActivitiesQueryString, insertActivitiesQueryValues, res, rows => {
                                        queryHelpers.commitTransaction(res, () => {
                                            res.sendStatus(200);
                                        });
                                    }, err => queryHelpers.rollbackTransaction(res, err));
                                }
                            }, err => queryHelpers.rollbackTransaction(res, err));
                        }, err => queryHelpers.rollbackTransaction(res, err));
                    }, err => queryHelpers.rollbackTransaction(res, err));
                }, err => queryHelpers.rollbackTransaction(res, err));
            }, err => queryHelpers.rollbackTransaction(res, err));
        }, null);
    }, null);
}

// Export router
export {
    router,
    updateDatabaseWithTours
}