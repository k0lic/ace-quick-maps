import { Environment } from "../../environment";

declare var require: any;
let Excel = require('exceljs');

let dateHelpers = require('./date-helpers');

let tourRoutes = require('../_routes/tour-routes');

async function testDrivingLog(res) {
    let workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(Environment.FILE_PATHS.DRIVING_LOG);

    let rows = extractAndResolveDrivingLogRows(workbook);
    let validRows = getValidDrivingLogRows(rows);

    tourRoutes.updateDatabaseWithDrivingLog(validRows, res);
}

async function testExcelFunction(res) {
    let workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(Environment.FILE_PATHS.TOUR_SCHEDULE);

    let rows = extractAndResolveExcelRows(workbook);

    let tours = consolidateRowsIntoTourObjects(rows);

    tourRoutes.updateDatabaseWithTours(tours, res);
}

function extractAndResolveDrivingLogRows(workbook): any[] {
    let worksheet = workbook.getWorksheet('Program vožnje');

    let rowObjs: any[] = [];
    // let DEBUG_LIMIT = 10;
    // let DEBUG_COUNTER = 0;
    worksheet.eachRow((row, rowNumber) => {
        // if (DEBUG_COUNTER >= DEBUG_LIMIT) {
        //     return;
        // }
        // DEBUG_COUNTER++;

        // Ignore header row
        if (rowNumber == 1) {
            return;
        }

        let date        = extractCellRawValue(workbook, worksheet, row, 1);
        let tourCode    = extractCellRawValue(workbook, worksheet, row, 2);
        let dayNumber    = extractCellRawValue(workbook, worksheet, row, 3);
        let destination    = extractCellRawValue(workbook, worksheet, row, 4);
        let vehicle1    = extractCellRawValue(workbook, worksheet, row, 5);
        let vehicle2    = extractCellRawValue(workbook, worksheet, row, 6);
        let vehicle3    = extractCellRawValue(workbook, worksheet, row, 7);
        let notice      = extractCellRawValue(workbook, worksheet, row, 11);

        rowObjs.push({
            rowNumber: rowNumber,
            date: date,
            tourCode: tourCode,
            tourName: '',
            startDate: null,
            dayNumber: dayNumber,
            destination: destination,
            vehicle1: vehicle1,
            vehicle2: vehicle2,
            vehicle3: vehicle3,
            notice: notice
        });
    });

    console.log('Extracted all DRIVING_LOG row objects: ' + rowObjs.length + ' in total');
    // console.log(rowObjs.slice(0, 5));
    return rowObjs;
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

function getValidDrivingLogRows(rows): any[] {
    let tourCodePattern = /^([^-]*)-([0-9]{2})\/([0-9]{2})\/([0-9]{2})$/;
    let tourNameDic: Map<string, string> = new Map([
        ['CROSG', 'CRO SG'],
        ['MCG1', 'MCG 1'],
        ['MCG2', 'MCG 2'],
        ['SEMK DE', 'SEMK - DE'],
        ['KE SER', 'SER'],
        ['JR BAK', 'JrBAK']
    ]);

    let validRows: any[] = [];
    let pretourCount = 0;
    let posttourCount = 0;
    let emptyRowCount= 0;
    rows.forEach((row: {
        rowNumber: number,
        date: Date,
        tourCode: string,
        tourName: string,
        startDate: Date,
        dayNumber: number,
        destination: string,
        vehicle1: string,
        vehicle2: string,
        vehicle3: string,
        notice: string
    }) => {
        // Check if date is not null
        if (row.date == null) {
            return;
        }

        // Check if tourCode represents a <name>-<date> combination
        let tourCodeMatch = row.tourCode.match(tourCodePattern);
        if (tourCodeMatch == null) {
            // TODO: serious - log it somewhere?
            console.log('<' + row.tourCode + '> at ' + row.rowNumber);
            return;
        }

        // Extract tour name and date
        row.tourName = tourCodeMatch[1];
        row.startDate = new Date(2000 + Number(tourCodeMatch[4]), Number(tourCodeMatch[3]) - 1, Number(tourCodeMatch[2]));

        // Perform renaming - some tours have slightly different names between this and the other excel file
        if (tourNameDic.has(row.tourName)) {
            // console.log('Found value in dictionary for <' + row.tourName + '>');
            row.tourName = tourNameDic.get(row.tourName);
        }

        // Remove pretour rows
        // TODO: incorporate pretour driving log rows
        if (row.dayNumber <= 0 || row.destination == 'Pretour') {
            pretourCount++;
            return;
        }
        if (row.destination.slice(0, 3) == 'Pre') {
            console.log('Is this a pretour row?\t' + row.destination + ' at ' + row.rowNumber);
        }

        // Remove post tour rows
        // TODO: incorporate post tour driving log rows
        if (row.destination == 'Post tour') {
            posttourCount++;
            return;
        }
        if (row.destination.slice(0, 4) == 'Post') {
            console.log('Is this a post tour row?\t' + row.destination + ' at ' + row.rowNumber);
        }

        // Remove rows with no content - no need to insert rows with no information since this table is gonna be optional in a LEFT JOIN operation
        // Rows with special values ['Bez Vozila', '-'] are better represented as null in the DB
        if ((row.vehicle1 == null || row.vehicle1 == 'Bez Vozila' || row.vehicle1 == '-') && row.vehicle2 == null && row.vehicle3 == null && row.notice == null) {
            emptyRowCount++;
            return;
        }

        // Use this row
        validRows.push(row);
    });

    console.log('Of which ' + (validRows.length + emptyRowCount + pretourCount + posttourCount) + ' are valid');
    console.log('Of which ' + validRows.length + ' are meaningful');
    // console.log(validRows.slice(0, 5));
    return validRows;
}

function consolidateRowsIntoTourObjects(rows): any[] {
    let tours: any[] = [];
    let currentTour: any = null;
    let preCollection: any[] = [];

    rows.forEach((row, rowNumber) => {
        // Adjust for 2 things: index starting from 0, deleted header row
        let excelRowNumber = rowNumber + 2;

        // Process special cases where departNum/dayNum is not a number
        if (typeof row.departNum == 'string') {
            if (row.departNum.slice(0, 4) == 'priv') {
                // Special case: priv. tours - private tours that are unique programs, should not be more than one
                row.departNum = 1;
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

        // Process regular values of departNum
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
            // Check arrDate?
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
                    let expectedDateString = dateHelpers.getDDMMYYYYslashed(expectedDate);
                    let foundDateString = dateHelpers.getDDMMYYYYslashed(arrDate);
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

export {
    testExcelFunction,
    testDrivingLog
}