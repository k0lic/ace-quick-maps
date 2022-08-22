declare var require: any;
let express = require('express');
let cors = require('cors');
let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');
let Excel = require('exceljs')

// !!! Setup pre-Routes
const app = express();

// Setup Cross-Origin Resource Sharing
app.use(cors({
    origin: [/((http|https):\/\/)?localhost/],
    optionsSuccessStatus: 200
}));

// parsers
app.use(bodyParser.json());
app.use(cookieParser());

// Database Connection
let mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'quick_maps_schema'
});
connection.connect((err) => {
    if (err) {
        console.error('error connecting to the DB: ' + err.stack);
        return;
    }

    console.log('Successfully connected to the DB!');
});

// !!! Routes
let router = express.Router();

router.get('/', (req, res) => {
    res.status(200).send('Hello from the new EXPRESS server! PogO');
});

// Location routes
router.get('/all_locations', (req, res) => {
    let query_string = 'SELECT * FROM `locations`';
    executeQuery(query_string, res);
});

router.post('/add_location', (req, res) => {
    let name = req.body.name;
    let lat = req.body.lat;
    let lng = req.body.lng;

    let query_string = 'INSERT INTO `locations` (`name`, `lat`, `lng`) VALUES (\'' + name + '\',\'' + lat + '\',\'' + lng + '\')';
    executeQueryWithoutResults(query_string, res);
});

router.post('/move_location', (req, res) => {
    let name = req.body.name;
    let lat = req.body.lat;
    let lng = req.body.lng;

    let query_string = 'UPDATE `locations` SET `lat` = \'' + lat + '\', `lng` = \'' + lng + '\' WHERE (`name` = \'' + name + '\')';
    executeQueryWithoutResults(query_string, res);
});

router.post('/delete_location', (req, res) => {
    let name = req.body.name;

    let query_string = 'DELETE FROM `quick_maps_schema`.`locations` WHERE (`name` = \'' + name + '\')';
    executeQueryWithoutResults(query_string, res);
});

// Program routes
router.get('/all_partners', (req, res) => {
    let query_string = 'SELECT * FROM partners';
    executeQuery(query_string, res);
});

router.get('/all_tour_programs', (req, res) => {
    let query_string = ''
        + 'SELECT pr.idprogram as id, pr.name as name, pr.idpartner as partner_id, pa.name as partner_name, pa.shorthand as parther_short '
        + 'FROM programs pr, partners pa '
        + 'WHERE pr.idpartner = pa.idpartner';  // join with partners might be unneeded
        
    executeQuery(query_string, res);
});

function getDayPointLocationJoinQuery(program_id: number): string {
    return ''
        + 'SELECT d.idprogram as program_id, d.number as day_number, d.description as day_description, '
        + 'p.idpoint as point_id, p.pointindex as point_index, p.location as location_name, p.lat as ff_lat, p.lng as ff_lng, '
        + 'p.idtype as point_type, p.description as point_description, '
        + 'l.lat as location_lat, l.lng as location_lng '
        + 'FROM program_days d '
        + 'LEFT JOIN points p '
        + 'ON d.idprogram = p.idprogram AND d.number = p.daynumber '
        + 'LEFT JOIN locations l '
        + 'ON p.location = l.name '
        + 'WHERE d.idprogram = ' + program_id + ' '
        + 'ORDER BY day_number, point_index';
}

router.post('/tour_program_days', (req, res) => {
    let program_id = req.body.id;

    let query_string = getDayPointLocationJoinQuery(program_id);
    executeQuery(query_string, res);
});

router.post('/tour_program_fixup', (req, res) => {
    let program_id = req.body.id;

    let query_string = getDayPointLocationJoinQuery(program_id);
    executeQueryWithCallback(query_string, res, rows => {
        // TODO: are there other cases where nothing should be done?
        if (rows.length == 0) {
            res.sendStatus(200);
            return;
        }

        let newRows = fixupProgramRows(program_id, rows);

        // Build the delete and insert queries
        let queries: string[] = [];
        let delete_old_rows_query = 'DELETE FROM points WHERE idprogram = ' + program_id;   // FOR TESTING: REPLACE <program_id> WITH HARDCODED VALUE
        queries.push(delete_old_rows_query);

        if (newRows.length > 0) {
            let insert_new_rows_query = 'INSERT INTO points (idprogram, daynumber, pointindex, location, lat, lng, idtype, description) VALUES ';
            let firstValue = true;
            newRows.forEach(row => {
                insert_new_rows_query += (firstValue?'':',') + '('
                    + row.idprogram + ',' // FOR TESTING: REPLACE <row.idprogram> WITH HARDCODED VALUE
                    + row.daynumber + ','
                    + row.pointindex + ','
                    + (row.location == null ? 'null' : '\'' + row.location + '\'') + ','
                    + (row.lat == null ? 'null' : row.lat) + ','
                    + (row.lng == null ? 'null' : row.lng) + ','
                    + '\'' + row.idtype + '\'' + ','
                    + '\'' + row.description + '\''
                    + ')';

                firstValue = false;
            });
            queries.push(insert_new_rows_query);
        }

        executeTransaction(queries, res);
    }, null);
});

function fixupProgramRows(program_id: number, rows: any[]): any[] {
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
                    idprogram: program_id,
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
                    idprogram: program_id,
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
                        idprogram: program_id,
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
                        idprogram: program_id,
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

function pointDayRowReplaceJustType(row, newType, index_increment: number) {
    return {
        idprogram: row.program_id,
        daynumber: row.day_number,
        pointindex: row.point_index + index_increment,
        location: row.location_name,
        lat: row.ff_lat,
        lng: row.ff_lng,
        idtype: newType,
        description: row.point_description
    };
}

function pointDayRowReplaceNothing(row, index_increment: number) {
    return {
        idprogram: row.program_id,
        daynumber: row.day_number,
        pointindex: row.point_index + index_increment,
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
    let program_id = req.body.id;
    let number = req.body.number;
    let description = req.body.description;

    let query_string = 'INSERT INTO program_days (idprogram, number, description) VALUES (\'' + program_id + '\',\'' + number + '\',\'' + description + '\')';
    executeQueryWithoutResults(query_string, res);
});

router.post('/delete_program_day', (req, res) => {
    // Remove all the points first
    let program_id = req.body.id;
    let number = req.body.number;

    let query_string_1 = 'DELETE FROM points WHERE idprogram = ' + program_id + ' AND daynumber = ' + number;
    let query_string_2 = 'DELETE FROM program_days WHERE idprogram = ' + program_id + ' AND number = ' + number;
    executeTransaction([query_string_1, query_string_2], res);
});

router.post('/add_point', (req, res) => {
    let program_id = req.body.id;
    let number = req.body.number;
    let point_index = req.body.index;
    let location_present = req.body.location_present;
    let location = req.body.location;
    let lat = req.body.lat;
    let lng = req.body.lng;
    let type = req.body.type;
    let description = req.body.description;

    let query_string = 'INSERT INTO points (idprogram, daynumber, pointindex, ' + (location_present? 'location, ' : 'lat, lng, ') + 'idtype, description) '
        + 'VALUES ('
        + '\'' + program_id + '\','
        + '\'' + number + '\','
        + '\'' + point_index + '\','
        + (location_present ? ('\'' + location + '\',') : '')
        + (!location_present ? ('\'' + lat + '\',') : '')
        + (!location_present ? ('\'' + lng + '\',') : '')
        + '\'' + type + '\','
        + '\'' + description + '\')';
    executeQueryWithoutResults(query_string, res);
});

router.post('/update_point', (req, res) => {
    let id = req.body.id;
    let point_index = req.body.index;
    let location = req.body.location;
    let lat = req.body.lat;
    let lng = req.body.lng;
    let type = req.body.type;
    let description = req.body.description;

    let query_string = 'UPDATE points '
        + 'SET pointindex = \'' + point_index + '\','
        + '     location = \'' + location + '\','
        + '     lat = \'' + lat + '\','
        + '     lng = \'' + lng + '\','
        + '     idtype = \'' + type + '\','
        + '     description = \'' + description + '\' '
        + 'WHERE idpoint = \'' + id + '\'';
    executeQueryWithoutResults(query_string, res);
});

router.post('/delete_point', (req, res) => {
    let id = req.body.id;

    let query_string = 'DELETE FROM points WHERE idpoint = \'' + id + '\'';
    executeQueryWithoutResults(query_string, res);
});

// Tour routes
router.post('/date_tour_info_confirmed', (req, res) => {
    let date = new Date(req.body.date);
    getTourInfoForDate(date, ['confirmed'], res);
});

function getTourInfoForDate(date, statusValues, res) {
    let statusValuesString = '';
    let firstValue = true;
    statusValues.forEach(v => {
        statusValuesString += (firstValue ? '' : ',') + quoteMe(v);
        firstValue = false;
    });

    let query = 'SELECT p.name as program, t.depart_num as depart, t.excel_row_number as excel_row, t.status as \'status\', t.start_date as start_date, t.end_date as end_date, '
                + '     d.date as \'date\', d.hotel1 as hotel1, d.hotel2 as hotel2, t.tour_guide as tour_guide, t.guests_raw as guests, a.description as activities, '
                + '     po.pointindex as point_index, po.location as location, po.idtype as point_type, l.lat as lat, l.lng as lng, po.lat as ff_lat, po.lng as ff_lng '
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
                + 'WHERE d.date = ' + quoteMe(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()) + ' AND t.status in (' + statusValuesString + ')';

    executeQuery(query, res);
}

function updateDatabaseWithTours(tours, res): void {
    // TODO: don't just copy these 3 into every function, come on man...
    const statusUnknown = 'unknown';
    const statusConfirmed = 'confirmed';
    const statusCanceled = 'canceled';

    // Excel contains program names, while database uses auto-generated keys for programs
    let allProgramsQuery = 'SELECT * FROM programs';
    executeQueryWithCallback(allProgramsQuery, res, programs => {
        // Create mapping from program name (eg. MCG1) to program id (eg. 31)
        let programNameMap: Map<string, number> = new Map();
        programs.forEach(p => {
            programNameMap.set(p.name, p.idprogram);
        });

        // tour_days and activities are set to Cascade on Delete
        let cleanupQuery = 'DELETE FROM tours';
        
        let insertToursQuery = 'INSERT INTO tours (excel_row_number, program_id, start_date, end_date, depart_num, tour_guide, guest_number, guests_raw, status) VALUES ';
        let firstTour = true;
        // let DEBUG_LIMIT = 10;
        tours.forEach(t => {
            // if (DEBUG_LIMIT <= 0) {
            //     return;
            // }

            insertToursQuery += (firstTour ? '' : ',') + '('
                + t.rowNumber + ','
                + programNameMap.get(String(t.name)) + ','
                + quoteMe(t.startDate.getFullYear() + '-' + (t.startDate.getMonth() + 1) + '-' + t.startDate.getDate()) + ','
                + quoteMe(t.endDate.getFullYear() + '-' + (t.endDate.getMonth() + 1) + '-' + t.endDate.getDate()) + ','
                + t.departNum + ','
                + quoteMe(t.tourGuide) + ','
                + t.guestNum + ','
                + quoteMe(t.guestNumRaw) + ','
                + quoteMe(t.status)
                + ')';
            firstTour = false;
            // DEBUG_LIMIT--;
        });

        beginTransaction(res, () => {
            executeQueryWithCallback(cleanupQuery, res, rows => {
                executeQueryWithCallback(insertToursQuery, res, rows => {
                    let fetchNewToursQuery = 'SELECT * FROM tours ORDER BY excel_row_number';
                    executeQueryWithCallback(fetchNewToursQuery, res, dbTours => {
                        let insertTourDaysQuery = 'INSERT INTO tour_days (tour_id, day_number, date, hotel1, hotel2) VALUES ';
                        let firstDay = true;
                        tours.forEach((t, tIndex) => {
                            t.days.forEach(d => {
                                insertTourDaysQuery += (firstDay ? '' : ',') + '('
                                    + dbTours[tIndex].id + ','
                                    + d.dayNum + ','
                                    + quoteMe(d.arrDate.getFullYear() + '-' + (d.arrDate.getMonth() + 1) + '-' + d.arrDate.getDate()) + ','
                                    + (d.hotel1 == null ? null : quoteMe(d.hotel1)) + ','
                                    + (d.hotel2 == null ? null : quoteMe(d.hotel2))
                                    + ')';
                                firstDay = false;
                            });
                        });

                        executeQueryWithCallback(insertTourDaysQuery, res, rows => {
                            let fetchNewTourDaysQuery = 'SELECT * FROM tour_days';
                            executeQueryWithCallback(fetchNewTourDaysQuery, res, dbTourDays => {
                                let insertActivitiesQuery = 'INSERT INTO activities (tour_day_id, activity_number, point_index, description) VALUES ';
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
                                        insertActivitiesQuery += (firstActivity ? '' : ',') + '('
                                            + dbDay.id + ','
                                            + activityNum + ','
                                            + null + ','
                                            + quoteMe(d.activities)
                                            + ')';
                                        activityNum++;
                                        firstActivity = false;
                                    });
                                });

                                // Only execute query if there are activities to add
                                if (!firstActivity) {
                                    executeQueryWithCallback(insertActivitiesQuery, res, rows => {
                                        commitTransaction(res, () => {
                                            res.sendStatus(200);
                                        });
                                    }, err => rollbackTransaction(res, err));
                                }
                            }, err => rollbackTransaction(res, err));
                        }, err => rollbackTransaction(res, err));
                    }, err => rollbackTransaction(res, err));
                }, err => rollbackTransaction(res, err));
            }, err => rollbackTransaction(res, err));
        }, null);
    }, null);
}

// Point Types routes
router.get('/all_point_types', (req, res) => {
    let query_string = 'SELECT * FROM point_types';
    executeQuery(query_string, res);
});

// Excel file routes
router.get('/process_excel_test_file', (req, res) => {
    testExcelFunction(res);
})

// Query helpers
function executeQueryWithoutResults(query_string: string, res): void {
    executeQueryWithCallback(query_string, res, rows => {
        res.sendStatus(200);
    }, null);
}

function executeQuery(query_string: string, res): void {
    executeQueryWithCallback(query_string, res, rows => {
        res.status(200).send(rows);
    }, null);
}

function executeQueryWithCallback(query_string: string, res, callback, err_callback): void {
    connection.query(query_string, (err, rows, fields) => {
        if (err) {
            if (err_callback != null) {
                err_callback(err);
            } else {
                console.log(err);
                res.sendStatus(500);
            }
            return;
        }

        callback(rows);
    });
}

// Execute queries one by one inside a transaction
function executeTransaction(queries: string[], res): void {
    beginTransaction(res, () => {
        executeQueries(queries, res, () => {
            commitTransaction(res, () => {
                res.sendStatus(200);
            });
        }, err => rollbackTransaction(res, err));
    }, null);
}

function beginTransaction(res, callback, err_callback) {
    connection.beginTransaction(err => {
        if (err) {
            if (err_callback != null) {
                err_callback(err);
            } else {
                console.log(err);
                res.sendStatus(500);
            }
            return;
        }
        
        callback();
    });
}

function rollbackTransaction(res, err) {
    return connection.rollback(() => {
        console.log(err);
        res.sendStatus(500);
    });
}

function commitTransaction(res, callback) {
    connection.commit(err => {
        if (err) {
            rollbackTransaction(res, err);
        }

        callback();
    });
}

// Execute queries one by one, calling this function recursively
function executeQueries(queries: string[], res, callback, err_callback): void {
    if (queries.length == 0) {
        // Job is done - all queries were executed
        callback();
        return;
    }

    executeQueryWithCallback(queries[0], res, rows => {
        executeQueries(queries.slice(1), res, callback, err_callback);
    }, err_callback);
}

// String helpers
function quoteMe(s: any): string {
    return '\'' + s + '\'';
}

// Excel file functions
async function testExcelFunction(res) {
    let workbook = new Excel.Workbook();
    await workbook.xlsx.readFile('D:\\ACE\\quick_maps\\main\\backend\\src\\TEST_2.xlsx');

    let rows = extractAndResolveExcelRows(workbook);

    let tours = consolidateRowsIntoTourObjects(rows);

    updateDatabaseWithTours(tours, res);
}

// Read through the rows of the Excel workbook and extract useful fields, resolving any links
function extractAndResolveExcelRows(workbook): any[] {
    let worksheet = workbook.getWorksheet('link');
    
    let rowObjs: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
        // Ignore header row
        if (rowNumber == 1) {
            return;
        }

        let operator    = extractCellRawValue(workbook, worksheet, row, 1);
        let tour        = extractCellRawValue(workbook, worksheet, row, 2);
        let departNum   = extractCellRawValue(workbook, worksheet, row, 3);
        let hotel1      = extractCellRawValue(workbook, worksheet, row, 4);
        let hotel2      = extractCellRawValue(workbook, worksheet, row, 5);
        let activities  = extractCellRawValue(workbook, worksheet, row, 6);
        let dayNum      = extractCellRawValue(workbook, worksheet, row, 7);
        let arrDate     = extractCellRawValue(workbook, worksheet, row, 8);
        let depDate     = extractCellRawValue(workbook, worksheet, row, 9);
        let status      = extractCellRawValue(workbook, worksheet, row, 10);
        let junkString  = extractCellRawValue(workbook, worksheet, row, 13);

        // console.log([operator, tour, departNum, dayNum, hotel1, status].join(','));
        // if (status != null && ['status', 'potvrdjena', 'otkazana', 'nepoznat', 'potvrdjen', 'potvrđena'].indexOf(status) == -1) {
        //     console.log('Weird status value: <' + status + '> at row ' + rowNumber);
        //     console.log(JSON.stringify(status));
        // }

        rowObjs.push({
            rowNumber: rowNumber,
            operator: operator,
            tour: tour,
            departNum: departNum,
            dayNum: dayNum,
            hotel1: hotel1,
            hotel2: hotel2,
            activities: activities,
            arrDate: arrDate,
            depDate: depDate,
            status: status,
            junkString: junkString
        });
    });

    console.log('Extracted all row objects: ' + rowObjs.length + ' in total');
    // console.log(rowObjs);
    // console.log(rowObjs.slice(0, 5));
    // console.log(rowObjs.slice(rowObjs.length - 5, rowObjs.length));
    // console.log(rowObjs.slice(1275, 1285));

    // let statusMap: Map<string, number> = new Map();
    // rowObjs.forEach(obj => {
    //     let key = obj.status ?? "<<NULL>>";
    //     statusMap.set(key, (statusMap.get(key)??0) + 1);
    // });
    // console.log(statusMap);
    // Map(6) {
    //     'potvrdjena' => 1643,
    //     '<<NULL>>' => 368,
    //     'otkazana' => 939,
    //     'nepoznat' => 279,
    //     'potvrđena' => 28,
    //     'potvrdjen' => 28
    // }

    return rowObjs;
}

function consolidateRowsIntoTourObjects(rows): any[] {
    let tours: any[] = [];
    let currentTour: any = null;
    let preCollection: any[] = [];

    rows.forEach((row, rowNumber) => {
        // Adjust for 2 things: index starting from 0, deleted header row
        let excelRowNumber = rowNumber + 2;

        let departure = row.departNum;
        let isPre = false;
        let isPost = false;

        // Process special cases where departNum is not a number
        if (typeof row.departNum == 'string') {
            if (row.departNum.slice(0, 4) == 'priv') {
                // Special case: priv. tours - private tours that are unique programs, should not be more than one
                departure = 1;
            } else if (row.departNum.slice(0, 3) == 'pre') {
                // Pretour day, just add to special pretour array for now
                // TODO: handle pre days, instead of just shooting them into an array and then ignoring them
                preCollection.push(row);
                return;
            } else if (row.departNum.slice(0, 4) == 'post') {
                // Posttour day, just add to special posttour array for now
                if (currentTour == null) {
                    // Unexpected post tour day - no existing tour to append to
                    console.log('Row ' + excelRowNumber + ' contains unexpected post tour day - could not find to which tour to attach it to');
                    return;
                }

                // TODO: handle post days, instead of just shooting them into an array and then ignoring them
                currentTour.postDays.push(row);
                return;
            } else {
                // Unexpected value - skip row
                console.log('Row ' + excelRowNumber + ' contains unexpected departNum value: <' + row.departNum + '>');
                return;
            }
        } else if (typeof row.dayNum != 'number') {
            if (typeof row.dayNum != 'string') {
                // Unexpected dayNum value
                console.log('Row ' + excelRowNumber + ' contains unexpected dayNum value: ' + JSON.stringify(row.dayNum));
                return;
            }

            if (row.dayNum.slice(0, 3) == 'pre') {
                // Pretour day, just add to special pretour array for now
                // TODO: handle pre days, instead of just shooting them into an array and then ignoring them
                preCollection.push(row);
                return;
            } else if (row.dayNum.slice(0, 4) == 'post') {
                // TODO: handle post days, instead of just shooting them into an array and then ignoring them
                currentTour.postDays.push(row);
                return;
            } else {
                // Unexpected dayNum value
                console.log('Row ' + excelRowNumber + ' contains unexpected dayNum value: ' + JSON.stringify(row.dayNum));
                return;
            }
        } else if (typeof row.departNum != 'number') {
            // Unexpected value - skip row
            console.log('Row ' + excelRowNumber + ' contains unexpected departNum value: <' + row.departNum + '>');
            return;
        }

        // TODO: Process regular values of departNum
        if (currentTour != null && row.tour == currentTour.name && row.departNum == currentTour.departNum) {
            // Add day to tour
            currentTour.days.push(row);
        } else {
            // Create new tour object
            currentTour = {
                rowNumber: row.rowNumber,
                name: row.tour,
                startDate: null,
                endDate: null,
                departNum: row.departNum,
                tourGuide: null,
                guestNum: null,
                guestNumRaw: null,
                status: null,
                invalidData: false,

                preDays: preCollection,
                days: [row],
                postDays: []
            };
            preCollection = [];

            // Append tour to tours array
            tours.push(currentTour);
        }
    });

    const statusUnknown = 'unknown';
    const statusConfirmed = 'confirmed';
    const statusCanceled = 'canceled';
    // Establish tour fields
    tours.forEach(tour => {
        // Establish tour start and end dates
        tour.startDate = tour.days[0].arrDate;
        tour.endDate = tour.days[tour.days.length - 1].arrDate;

        // Establish tour status
        let firstDay = tour.days[0];
        if (typeof firstDay.status != 'string') {
            console.log('Unexpected status at row ' + firstDay.rowNumber + ': <' + firstDay.status + '> regarded as \'unknown\'');
            tour.status = statusUnknown;
        } else if (firstDay.status.slice(0, 5) == 'potvr') {
            tour.status = statusConfirmed;
        } else if (firstDay.status.slice(0, 5) == 'otkaz') {
            tour.status = statusCanceled;
        } else if (firstDay.status.slice(0, 5) == 'nepoz') {
            tour.status = statusUnknown;
        } else {
            console.log('Unexpected status at row ' + firstDay.rowNumber + ': <' + firstDay.status + '> regarded as \'unknown\'');
            tour.status = statusUnknown;
        }

        // Extract guest number and tour guide name from junkString - use the first day
        if (firstDay.junkString != null && typeof firstDay.junkString == 'string') {
            let paxRegex = /^([0-9\(\)\+ ]+)pax/;
            let guideRegex = /^[0-9\(\)\+]+pax\s+\S+\s+(.+)$/;

            // console.log(firstDay.rowNumber + '\t' + JSON.stringify(firstDay.junkString));
            let paxMatch = firstDay.junkString.match(paxRegex);
            let guideMatch = firstDay.junkString.match(guideRegex);

            if (paxMatch != null) {
                // Three cases: normal: 2pax; parentheses: (3)2pax; sum: 2+1pax
                // For parentheses case, use the number outside
                // For sum case, calculate the sum
                let parenthesesNumRegex = /^\([0-9]+\)\s*([0-9]+)$/;
                let sumRegex = /^([0-9]+)\s*\+\s*([0-9]+)$/;

                let paxString = paxMatch[1].trim();
                tour.guestNumRaw = paxMatch[0];

                let parenthesesNumMatch = paxString.match(parenthesesNumRegex);
                let sumMatch = paxString.match(sumRegex);

                if (parenthesesNumMatch != null) {
                    tour.guestNum = Number(parenthesesNumMatch[1])
                } else if (sumMatch != null) {
                    tour.guestNum = Number(sumMatch[1]) + Number(sumMatch[2]);
                } else {
                    tour.guestNum = Number(paxString);
                }

                if (tour.guestNum == null || isNaN(tour.guestNum)) {
                    console.log('Unsuccessful string to number cast at row ' + firstDay.rowNumber + ' - tried to cast \'' + paxMatch[1] + '\'');
                }
            }
            if (guideMatch != null) {
                tour.tourGuide = guideMatch[1].trim();
            }
        } else {
            // Ignore null values - report everything else that's unexpected only for confirmed tours
            if (firstDay.junkString != null && tour.status == statusConfirmed) {
                console.log('Unexpected value for \'pax / rooms /  structure\' column at row ' + firstDay.rowNumber);
            }
        }

        let lastDay = 0;
        let expectedDate: Date | null = null;
        // Check if everything is as expected
        tour.days.forEach((day, dayNumber) => {
            // // Check day number is as expected
            // if (day.dayNum != lastDay + 1) {
            //     // TODO: is this important, should we do something except logging?
            //     console.log('Unexpected day number at row ' + day.rowNumber + ' - Got <' + day.dayNum + '> while expecting ' + (lastDay + 1));
            // }

            // TODO: check arrDate?
            let arrDate = day.arrDate;
            if (arrDate == null) {
                if (expectedDate != null) {
                    // Automatically use the expected date for row, if field is empty
                    arrDate = expectedDate;
                    tour.days[dayNumber].arrDate = arrDate;
                } else {
                    // Field is empty, and there's no previous value to use - report issue only for confirmed tours
                    if (tour.status == statusConfirmed) {
                        console.log('Missing arrDate value at row ' + day.rowNumber);
                    }
                    tour.invalidData = true;
                }
            }
            if (arrDate != null && !(arrDate instanceof Date)) {
                if (tour.status == statusConfirmed) {
                    console.log('Unexpected arrDate type at row ' + day.rowNumber + ': expected a Date');
                }
                tour.invalidData = true;
            } else if (expectedDate != null && (arrDate.getFullYear() != expectedDate.getFullYear() 
                || arrDate.getMonth() != expectedDate.getMonth() || arrDate.getDate() != expectedDate.getDate())
            ) {
                if (tour.status == statusConfirmed) {
                    let expectedDateString = expectedDate.getDate() + '/' + (expectedDate.getMonth() + 1) + '/' + expectedDate.getFullYear();
                    let foundDateString = arrDate.getDate() + '/' + (arrDate.getMonth() + 1) + '/' + arrDate.getFullYear();
                    console.log('Unexpected arrDate value at row ' + day.rowNumber + ': expected ' + expectedDateString + ' but found ' + foundDateString);
                }
                tour.invalidData = true;
            }
            if (arrDate != null && arrDate instanceof Date) {
                expectedDate = new Date(arrDate);
                expectedDate.setDate(arrDate.getDate() + 1);
            }

            lastDay = day.dayNum;
        });
    });

    let validTours = tours.filter(t => !t.invalidData);
    let invalidTours = tours.filter(t => t.invalidData);
    let confirmedTours = validTours.filter(t => t.status == statusConfirmed);
    let canceledTours = validTours.filter(t => t.status == statusCanceled);
    let unknownTours = validTours.filter(t => t.status == statusUnknown);

    // console.log(invalidTours);

    console.log('Created all tour objects: ' + tours.length + ' in total');
    console.log('Of which ' + validTours.length + ' have valid data');
    console.log('Of which ' + confirmedTours.length + ' are confirmed, ' + canceledTours.length + ' are canceled, and ' + unknownTours.length + ' are unknown');
    // console.log(tours.filter(t => t.name == 'CRO003'));

    return validTours;
}

function extractCellRawValue(workbook, worksheet, row, cellIndex) {
    // Fetch cell value
    let cellValue = row.getCell(cellIndex).value;

    // Extract formula result, if cell content is a formula
    cellValue = checkIfExcelLinkAndEvaluate(workbook, worksheet, cellValue);

    return cellValue;
}

function checkIfExcelLinkAndEvaluate(workbook, worksheet, cell) {
    // Check if cell is a formula cell
    if (cell == null || typeof cell != 'object' || (!('formula' in cell) && !('sharedFormula' in cell))) {
        // Give up - cell value is not a formula
        return cell;
    }

    // Construct regexs that extract: cell address; worksheet name and cell address
    let regexIntern = /^([^!]+)$/;
    let regexExtern = /^([^!]+)!([^!]+)$/;

    // Match regular expressions
    let matchIntern = (('formula' in cell) ? cell.formula : cell.sharedFormula).match(regexIntern);
    let matchExtern = (('formula' in cell) ? cell.formula : cell.sharedFormula).match(regexExtern);

    // Extract cell address (? and worksheet name if present) if possible
    if (matchIntern == null && matchExtern == null) {
        // Formula is not of link type - use result if available
        if ('result' in cell) {
            return cell.result;
        }

        return cell;
    }
    let worksheetName = matchExtern == null ? null : matchExtern[1];
    let cellAddress = matchExtern == null ? matchIntern[1] : matchExtern[2];

    // Fetch target cell
    let targetWorksheet = matchExtern == null ? worksheet : workbook.getWorksheet(worksheetName);
    if (targetWorksheet != null) {
        let targetCell = targetWorksheet.getCell(cellAddress);

        if (targetCell != null) {
            // Recursively travel through the chain of links until you resolve to a value
            return checkIfExcelLinkAndEvaluate(workbook, targetWorksheet, targetCell.value);
        }
    }

    // Couldn't resolve link - try to fallback to result field
    if ('result' in cell) {
        return cell.result;
    }

    return cell;
}

// !!! Setup post-Routes
app.use("/", router);
app.listen(4000, () => console.log('Express server running on port 4000'));