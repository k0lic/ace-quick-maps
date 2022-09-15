import { respondWith200, respondWith500, respondWithJust200 } from "../_helpers/http-responses";
import { executeQuery, executeTransaction } from "../_helpers/query-helpers";

declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');

// Make sure only 'admin' users have access
router.use(userCheckers.assertIsAdmin);

// List routes here
router.get('/all_partners', (req, res) => {
    let queryString = 'SELECT * FROM partners';
    executeQuery(queryString, [], rows => respondWith200(res, rows), err => respondWith500(res, err));
});

router.get('/all_tour_programs', (req, res) => {
    let queryString = ''
        + 'SELECT pr.idprogram as id, pr.name as name, pr.idpartner as partner_id, pa.name as partner_name, pa.shorthand as parther_short '
        + 'FROM programs pr, partners pa '
        + 'WHERE pr.idpartner = pa.idpartner';  // join with partners might be unneeded
        
    executeQuery(queryString, [], rows => respondWith200(res, rows), err => respondWith500(res, err));
});

function getDayPointLocationJoinQuery(programId: number): [string, any] {
    let queryString = ''
        + 'SELECT d.idprogram as program_id, d.number as day_number, d.description as day_description, '
        + 'p.idpoint as point_id, p.pointindex as point_index, p.location as location_name, p.lat as ff_lat, p.lng as ff_lng, '
        + 'p.idtype as point_type, p.description as point_description, '
        + 'l.lat as location_lat, l.lng as location_lng '
        + 'FROM program_days d '
        + 'LEFT JOIN points p '
        + 'ON d.idprogram = p.idprogram AND d.number = p.daynumber '
        + 'LEFT JOIN locations l '
        + 'ON p.location = l.name '
        + 'WHERE d.idprogram = ? '
        + 'ORDER BY day_number, point_index';
    let queryValues = [programId];
    return [queryString, queryValues];
}

router.post('/tour_program_days', (req, res) => {
    let programId = req.body.id;

    let joinQuery = getDayPointLocationJoinQuery(programId);
    let queryString = joinQuery[0];
    let queryValues = joinQuery[1];

    executeQuery(queryString, queryValues, rows => respondWith200(res, rows), err => respondWith500(res, err));
});

router.post('/tour_program_fixup', (req, res) => {
    let programId = req.body.id;

    let joinQuery = getDayPointLocationJoinQuery(programId);
    let queryString = joinQuery[0];
    let queryValues = joinQuery[1];

    executeQuery(queryString, queryValues, rows => {
        // TODO: are there other cases where nothing should be done?
        if (rows.length == 0) {
            res.sendStatus(200);
            return;
        }

        let newRows = fixupProgramRows(programId, rows);

        // Build the delete and insert queries
        let queryStrings: string[] = [];
        let queryValues: any[] = [];

        let deleteOldRowsQueryString = 'DELETE FROM points WHERE idprogram = ?';
        let deleteOldRowsQueryValues = [programId];   // FOR TESTING: REPLACE <programId> WITH HARDCODED VALUE
        queryStrings.push(deleteOldRowsQueryString);
        queryValues.push(deleteOldRowsQueryValues);

        if (newRows.length > 0) {
            let insertNewRowsQueryString = 'INSERT INTO points (idprogram, daynumber, pointindex, location, lat, lng, idtype, description) VALUES ?';

            let insertNewRowsQueryValues: any[] = [[]];
            newRows.forEach(row => {
                insertNewRowsQueryValues[0].push([
                    row.idprogram,
                    row.daynumber,
                    row.pointindex,
                    row.location,
                    row.lat,
                    row.lng,
                    row.idtype,
                    row.description
                ]);
            });

            queryStrings.push(insertNewRowsQueryString);
            queryValues.push(insertNewRowsQueryValues);
        }

        executeTransaction(queryStrings, queryValues, () => respondWithJust200(res), err => respondWith500(res, err));
    }, err => respondWith500(res, err));
});

function fixupProgramRows(programId: number, rows: any[]): any[] {
    // Extract info before processing
    let lastDayNumber = 0;
    let lastDayLastPointIndex = 0;
    let dailyHotelInfo: any[] = [];
    rows.forEach(row => {
        if (row.day_number > lastDayNumber) {
            lastDayNumber = row.day_number;
            lastDayLastPointIndex = row.point_index??0;

            dailyHotelInfo.push({
                day_number: row.day_number,
                hotel_point_count: 0,
                first_location: null,
                first_location_index: 0,
                last_location: null,
                last_location_index: 0,
                last_index: row.point_index??0,
                increment_points: 0
            });
        } else if (row.day_number == lastDayNumber && (row.point_index??0) > lastDayLastPointIndex) {
            lastDayLastPointIndex = row.point_index??0;
            dailyHotelInfo[dailyHotelInfo.length - 1].last_index = row.point_index??0;
        }

        if (row.point_type == 'hotel') {
            let lastIndex = dailyHotelInfo.length - 1;

            if (dailyHotelInfo[lastIndex].hotel_point_count == 0) {
                dailyHotelInfo[lastIndex].first_location = row.location_name;
                dailyHotelInfo[lastIndex].first_location_index = row.point_index;
            }
            dailyHotelInfo[lastIndex].last_location = row.location_name;
            dailyHotelInfo[lastIndex].last_location_index = row.point_index;

            dailyHotelInfo[lastIndex].hotel_point_count++;
        }
    });

    // First process every day, maybe enter points that don't exist in the original collection
    let newRows: any[] = [];
    let currentLocation = null;
    let changesMade = true;
    while (changesMade) {       // TODO: while loop might be redundant after I made changes to the foreach callback - MIGHT
        currentLocation = null;
        changesMade = false;
        dailyHotelInfo.forEach((info, index, arr) => {
            // Add hotel checkout to start of day
            if (currentLocation != null && ((info.hotel_point_count == 1 && info.first_location_index == info.last_index && info.first_location != currentLocation) // There's an apparent checkin at the end of the day
                                            || (info.hotel_point_count == 0 && info.day_number == lastDayNumber)    // This is the last day and there's no hotel info
                                            || (info.hotel_point_count == 0 && info.day_number < lastDayNumber && arr[index + 1].hotel_point_count > 0  // There's no hotel info, and there's a different hotel tomorrow at the start of the day
                                            && arr[index + 1].last_index > 1 && arr[index + 1].first_location_index == 1 && arr[index + 1].first_location != currentLocation)
            )) {
                newRows.push({
                    idprogram: programId,
                    daynumber: info.day_number,
                    pointindex: 1,
                    location: currentLocation,
                    lat: null,
                    lng: null,
                    idtype: 'hotel_checkout',
                    description: ''
                });
                changesMade = true;

                rememberHotelAddedToStartOfDayInInfo(arr, index, currentLocation);
                info = arr[index];
            }
            // Add hotel stay to start of day
            else if (currentLocation != null && info.day_number != lastDayNumber
            && (info.hotel_point_count == 0 && (arr[index + 1].hotel_point_count == 0 
                                                || (arr[index + 1].hotel_point_count > 0 && arr[index + 1].first_location_index == arr[index + 1].last_index)
                                                || (arr[index + 1].hotel_point_count > 0 && arr[index + 1].first_location_index == 1 && arr[index + 1].first_location == currentLocation)
                                                ) 
                || (info.hotel_point_count == 1 && info.first_location_index == info.last_index && info.first_location == currentLocation))) {
                newRows.push({
                    idprogram: programId,
                    daynumber: info.day_number,
                    pointindex: 1,
                    location: currentLocation,
                    lat: null,
                    lng: null,
                    idtype: 'hotel_stay',
                    description: ''
                });
                changesMade = true;

                rememberHotelAddedToStartOfDayInInfo(arr, index, currentLocation);
                info = arr[index];
            }

            // Adding to end of day doesn't happen on last day
            if (info.day_number < lastDayNumber) {
                let tomorrowsInfo = arr[index + 1];
                if (info.hotel_point_count > 0) {
                    currentLocation = info.last_location;
                }

                // Add hotel checkin to end of day
                if ((info.hotel_point_count == 0 || (info.hotel_point_count == 1 && info.first_location_index == 1 && (info.day_number > 1 || info.last_index > 1))) 
                && tomorrowsInfo.hotel_point_count > 0 && tomorrowsInfo.last_index > 1 && tomorrowsInfo.first_location_index == 1 && tomorrowsInfo.first_location != currentLocation) {
                    newRows.push({
                        idprogram: programId,
                        daynumber: info.day_number,
                        pointindex: info.last_index + 1,
                        location: tomorrowsInfo.first_location,
                        lat: null,
                        lng: null,
                        idtype: 'hotel_checkin',
                        description: ''
                    });
                    changesMade = true;
                    currentLocation = tomorrowsInfo.first_location;

                    rememberHotelAddedToEndOfDayInInfo(arr, index, currentLocation);
                    return;
                }
                // Add hotel stay to end of day
                if (currentLocation != null && (info.hotel_point_count == 0 || (info.hotel_point_count == 1 && info.first_location_index == 1 && (info.day_number > 1 || info.last_index > 1)))
                && (tomorrowsInfo.hotel_point_count == 0 
                    || (tomorrowsInfo.hotel_point_count > 0 && tomorrowsInfo.first_location_index == tomorrowsInfo.last_index)
                    || (tomorrowsInfo.hotel_point_count > 0 && tomorrowsInfo.first_location_index == 1 && tomorrowsInfo.first_location == currentLocation)
                )) {
                    newRows.push({
                        idprogram: programId,
                        daynumber: info.day_number,
                        pointindex: info.last_index + 1,
                        location: currentLocation,
                        lat: null,
                        lng: null,
                        idtype: 'hotel_stay',
                        description: ''
                    });
                    changesMade = true;

                    rememberHotelAddedToEndOfDayInInfo(arr, index, currentLocation);
                    return;
                }
            }

            // Update current location to last hotel location
            currentLocation = info.last_location;
        });
    }

    // Process every point
    currentLocation = null;
    let currentDayNumber = 1;
    rows.forEach(row => {
        let todaysInfo = dailyHotelInfo[row.day_number - 1];
        let updatedPointIndex = row.point_index + todaysInfo.increment_points;
        // Check dailyHotelInfo in order to catch newly added points - from the loop above this one
        if (row.day_number != currentDayNumber && dailyHotelInfo[row.day_number - 2].hotel_point_count > 0) {
            currentLocation = dailyHotelInfo[row.day_number - 2].last_location; // fetch yesterday's last location
            currentDayNumber = row.day_number;
        }

        // Process 'flight' points
        if (row.point_type == 'flight') {
            // Arrival
            if (row.day_number == 1 && updatedPointIndex == 1) {
                newRows.push(pointDayRowReplaceJustType(row, 'flight_arrival', todaysInfo.increment_points));
                return;
            }
            // Departure
            if (row.day_number == lastDayNumber && updatedPointIndex == todaysInfo.last_index) {
                newRows.push(pointDayRowReplaceJustType(row, 'flight_departure', todaysInfo.increment_points));
                return;
            }
        }

        // Process 'hotel' points
        if (row.point_type == 'hotel') {
            if (todaysInfo.hotel_point_count < 3) {
                // Check-in
                if ((currentLocation == null || currentLocation != row.location_name) && todaysInfo.last_index == updatedPointIndex) {
                    newRows.push(pointDayRowReplaceJustType(row, 'hotel_checkin', todaysInfo.increment_points));
                    currentLocation = row.location_name;
                    return;
                }
                // Check-out
                if (currentLocation != null && currentLocation == row.location_name && updatedPointIndex == 1 && (
                    (row.day_number == lastDayNumber && todaysInfo.hotel_point_count == 1) || (
                        row.day_number != lastDayNumber && todaysInfo.hotel_point_count == 2 && todaysInfo.first_location != todaysInfo.last_location
                    )
                )) {
                    newRows.push(pointDayRowReplaceJustType(row, 'hotel_checkout', todaysInfo.increment_points));
                    currentLocation = row.location_name;
                    return;
                }
                // Stay
                if (currentLocation != null && currentLocation == row.location_name && (updatedPointIndex == 1 || updatedPointIndex == todaysInfo.last_index) && (
                    todaysInfo.hotel_point_count == 1 || todaysInfo.first_location == todaysInfo.last_location
                )) {
                    newRows.push(pointDayRowReplaceJustType(row, 'hotel_stay', todaysInfo.increment_points));
                    currentLocation = row.location_name;
                    return;
                }
            }

            currentLocation = row.location_name;
        }

        // Copy every other non-null point
        if (row.point_index != null) {
            newRows.push(pointDayRowReplaceNothing(row, todaysInfo.increment_points));
        }
    });

    return newRows;
}

function pointDayRowReplaceJustType(row, newType, indexIncrement: number) {
    return {
        idprogram: row.program_id,
        daynumber: row.day_number,
        pointindex: row.point_index + indexIncrement,
        location: row.location_name,
        lat: row.ff_lat,
        lng: row.ff_lng,
        idtype: newType,
        description: row.point_description
    };
}

function pointDayRowReplaceNothing(row, indexIncrement: number) {
    return {
        idprogram: row.program_id,
        daynumber: row.day_number,
        pointindex: row.point_index + indexIncrement,
        location: row.location_name,
        lat: row.ff_lat,
        lng: row.ff_lng,
        idtype: row.point_type,
        description: row.point_description
    };
}

function rememberHotelAddedToStartOfDayInInfo(arr, index, currentLocation): void {
    // Update day info
    arr[index].hotel_point_count++;
    arr[index].first_location = currentLocation;
    arr[index].first_location_index = 1;
    if (arr[index].hotel_point_count == 1) {
        arr[index].last_location = currentLocation;
        arr[index].last_location_index = 1;
    } else {
        arr[index].last_location_index++;
    }
    arr[index].last_index++;
    // Remember to increment every point added afterwards
    arr[index].increment_points++;
}

function rememberHotelAddedToEndOfDayInInfo(arr, index, currentLocation): void {
    // Update day info
    arr[index].last_index++;
    arr[index].hotel_point_count++;
    arr[index].last_location = currentLocation;
    arr[index].last_location_index = arr[index].last_index;
    if (arr[index].hotel_point_count == 1) {
        arr[index].first_location = currentLocation;
        arr[index].first_location_index = arr[index].last_index;
    }
}

router.post('/add_program_day', (req, res) => {
    let programId = req.body.id;
    let number = req.body.number;
    let description = req.body.description;

    let queryString = 'INSERT INTO program_days (idprogram, number, description) VALUES ?';
    let queryValues = [[[programId, number, description]]];
    executeQuery(queryString, queryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
});

router.post('/delete_program_day', (req, res) => {
    // Remove all the points first
    let programId = req.body.id;
    let number = req.body.number;

    let queryString1 = 'DELETE FROM points WHERE idprogram = ? AND daynumber = ?';
    let queryValues1 = [programId, number];

    let queryString2 = 'DELETE FROM program_days WHERE idprogram = ? AND number = ?';
    let queryValues2 = [programId, number];

    executeTransaction([queryString1, queryString2], [queryValues1, queryValues2], () => respondWithJust200(res), err => respondWith500(res, err));
});

router.post('/add_point', (req, res) => {
    let programId = req.body.id;
    let number = req.body.number;
    let pointIndex = req.body.index;
    let locationPresent = req.body.location_present;
    let location = req.body.location;
    let lat = req.body.lat;
    let lng = req.body.lng;
    let type = req.body.type;
    let description = req.body.description;

    let queryString = 'INSERT INTO points (idprogram, daynumber, pointindex, location, lat, lng, idtype, description) VALUES ?';
    let queryValues = [[[
        programId,
        number,
        pointIndex,
        locationPresent ? location : null,
        locationPresent ? null : lat,
        locationPresent ? null : lng,
        type,
        description
    ]]];

    executeQuery(queryString, queryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
});

router.post('/update_point', (req, res) => {
    let id = req.body.id;
    let pointIndex = req.body.index;
    let location = req.body.location;
    let lat = req.body.lat;
    let lng = req.body.lng;
    let type = req.body.type;
    let description = req.body.description;

    let queryString = 'UPDATE points '
        + 'SET pointindex = ?,'
        + '     location = ?,'
        + '     lat = ?,'
        + '     lng = ?,'
        + '     idtype = ?,'
        + '     description = ? '
        + 'WHERE idpoint = ?';
    let queryValues = [pointIndex, location, lat, lng, type, description, id];

    executeQuery(queryString, queryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
});

router.post('/delete_point', (req, res) => {
    let id = req.body.id;

    let queryString = 'DELETE FROM points WHERE idpoint = ?';
    let queryValues = [id];
    executeQuery(queryString, queryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
});

// Export router
export {
    router
}