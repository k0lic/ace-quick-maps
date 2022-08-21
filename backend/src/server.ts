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
    connection.query(query_string, (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

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
                    first_location: '',
                    first_location_index: 0,
                    last_location: '',
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

        // TODO: maybe this can be extracted into a function that performs n queries inside a transaction?
        // Begin transaction
        connection.beginTransaction(err => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }

            // Delete old points
            let delete_old_rows_query = 'DELETE FROM points WHERE idprogram = ' + program_id;   // FOR TESTING: REPLACE <program_id> WITH HARDCODED VALUE 
            connection.query(delete_old_rows_query, (err, rows, fields) => {
                if (err) {
                    // Rollback the transaction
                    return connection.rollback(() => {
                        console.log(err);
                        res.sendStatus(500);
                    });
                }
                
                // Insert new points
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

                connection.query(insert_new_rows_query, (err, rows, fields) => {
                    if (err) {
                        // Rollback the transaction
                        return connection.rollback(() => {
                            console.log(err);
                            res.sendStatus(500);
                        });
                    }

                    // Commit transaction
                    connection.commit(err => {
                        if (err) {
                            // Rollback the transaction
                            return connection.rollback(() => {
                                console.log(err);
                                res.sendStatus(500);
                            });
                        }

                        // Send success confirmation
                        res.sendStatus(200);
                    });
                });
            });
        });
    });
});

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
    // TODO: remove all the points first, yeah?
    let program_id = req.body.id;
    let number = req.body.number;

    let query_string_1 = 'DELETE FROM points WHERE idprogram = ' + program_id + ' AND daynumber = ' + number;
    let query_string_2 = 'DELETE FROM program_days WHERE idprogram = ' + program_id + ' AND number = ' + number;
    connection.query(query_string_1, (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        connection.query(query_string_2, (err, rows, fields) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }
    
            res.sendStatus(200);
        });
    });
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
    connection.query(query_string, (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        res.sendStatus(200);
    });
}

function executeQuery(query_string: string, res): void {
    connection.query(query_string, (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        res.status(200).send(rows);
    });
}

// Excel file functions
async function testExcelFunction(res) {
    let workbook = new Excel.Workbook();
    await workbook.xlsx.readFile('D:\\ACE\\quick_maps\\main\\backend\\src\\Raspored tura 2022.xlsx');

    let worksheet = workbook.getWorksheet('link');
    
    let rowObjs: any[] = [];
    worksheet.eachRow((row, rowNumber) => {

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

    res.sendStatus(200);
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
        // Give up - formula is not of link type
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

    // Couldn't resolve link
    return cell;
}

// !!! Setup post-Routes
app.use("/", router);
app.listen(4000, () => console.log('Express server running on port 4000'));