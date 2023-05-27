import { atRowMessage, DatasetErrorReport, missingValueMsg, unexpectedValueMsg } from "./dataset-error-report";
import { normalLog } from "./logger";
import { getDrivingLogLocalPath, getTourScheduleLocalPath, getYear } from "./version-helper";

declare var require: any;
let Excel = require('exceljs');

let dateHelpers = require('./date-helpers');

// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// Driving Log functions
const processDrivingLogExcelFileVersions = {
    2022: processDrivingLogExcelFileV1,
    2023: processDrivingLogExcelFileV2,
    2024: processDrivingLogExcelFileV2,
};

async function processDrivingLogExcelFileSelectVersion(report: DatasetErrorReport, callback, errCallback) {
    getYear(year => processDrivingLogExcelFileVersions[year](year, report, callback), errCallback);
}

async function processDrivingLogExcelFileV1(year: number, report: DatasetErrorReport, callback) {
    let workbook = new Excel.Workbook();

    let filePath = getDrivingLogLocalPath(year);
    // Skip if filePath is empty - don't go into errCallback, subsequent steps might still be possible
    if (filePath == '') {
        normalLog('  processDrivingLogExcelFileV1 skip because of empty file path');
        callback([]);
        return;
    }

    await workbook.xlsx.readFile(filePath);

    let rows = extractAndResolveDrivingLogRowsV1(workbook, report);
    let validRows = getValidDrivingLogRowsV1(rows, report);

    callback(validRows);
}

function extractAndResolveDrivingLogRowsV1(workbook, report: DatasetErrorReport): any[] {
    let worksheet = workbook.getWorksheet('Program vožnje');

    let rowObjs: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber == 1) {
            return;
        }

        let date = extractCellRawValue(workbook, worksheet, row, 1);
        let tourCode = extractCellRawValue(workbook, worksheet, row, 2);
        let dayNumber = extractCellRawValue(workbook, worksheet, row, 3);
        let destination = extractCellRawValue(workbook, worksheet, row, 4);
        let vehicle1 = extractCellRawValue(workbook, worksheet, row, 5);
        let vehicle2 = extractCellRawValue(workbook, worksheet, row, 6);
        let vehicle3 = extractCellRawValue(workbook, worksheet, row, 7);
        let notice = extractCellRawValue(workbook, worksheet, row, 11);

        rowObjs.push({
            rowNumber: rowNumber,
            date: date,
            tourCode: tourCode,
            tourName: '',
            startDate: null,
            dayNumber: dayNumber,
            destination: destination,
            vehicle1: vehicle1,
            driver1: null,
            vehicle2: vehicle2,
            driver2: null,
            vehicle3: vehicle3,
            driver3: null,
            carrier1: null,
            type1: null,
            carrier2: null,
            type2: null,
            carrier3: null,
            type3: null,
            notice: notice
        });
    });

    // report.info.push('Extracted all DRIVING_LOG row objects: ' + rowObjs.length + ' in total');
    report.addInfo('Extracted all DRIVING_LOG row objects: ' + rowObjs.length + ' in total');
    return rowObjs;
}

function getValidDrivingLogRowsV1(rows, report: DatasetErrorReport): any[] {
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
    let emptyRowCount = 0;
    rows.forEach((row: {
        rowNumber: number,
        date: Date,
        tourCode: string,
        tourName: string,
        startDate: Date,
        dayNumber: number,
        destination: string,
        vehicle1: string,
        driver1: String,
        vehicle2: string,
        driver2: String,
        vehicle3: string,
        driver3: String,
        carrier1: String,
        type1: String,
        carrier2: String,
        type2: String,
        carrier3: String,
        type3: String,
        notice: string
    }) => {
        // Check if date is not null
        if (row.date == null) {
            return;
        }

        // Check if tourCode represents a <name>-<date> combination
        let tourCodeMatch = row.tourCode.match(tourCodePattern);
        if (tourCodeMatch == null) {
            // Serious error - Include it in the report
            // report.errors.push(unexpectedValueMsg('TourCode', row.tourCode, row.rowNumber, null));
            report.addError(unexpectedValueMsg('TourCode', row.tourCode, row.rowNumber, null))
            return;
        }

        // Extract tour name and date
        row.tourName = tourCodeMatch[1];
        row.startDate = new Date(2000 + Number(tourCodeMatch[4]), Number(tourCodeMatch[3]) - 1, Number(tourCodeMatch[2]));

        // Perform renaming - some tours have slightly different names between this and the other excel file
        if (tourNameDic.has(row.tourName)) {
            row.tourName = tourNameDic.get(row.tourName);
        }

        // Remove pretour rows
        // TODO: incorporate pretour driving log rows
        if (row.dayNumber <= 0 || row.destination == 'Pretour') {
            pretourCount++;
            return;
        }

        // Remove post tour rows
        // TODO: incorporate post tour driving log rows
        if (row.destination == 'Post tour') {
            posttourCount++;
            return;
        }
        if (row.destination.slice(0, 4) == 'Post') {
            // console.log('Is this a post tour row?\t' + row.destination + ' at ' + row.rowNumber);
        }

        // Remove rows with no content - no need to insert rows with no information since this table is gonna be optional in a LEFT JOIN operation
        // Rows with special values ['Bez Vozila', '-'] are better represented as null in the DB
        if ((row.vehicle1 == null || row.vehicle1.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.vehicle1 == '-')
            && row.vehicle2 == null && row.vehicle3 == null && row.notice == null
        ) {
            emptyRowCount++;
            return;
        }

        // Use this row
        validRows.push(row);
    });

    // report.info.push('Of which ' + (validRows.length + emptyRowCount + pretourCount + posttourCount) + ' are valid');
    report.addInfo('Of which ' + (validRows.length + emptyRowCount + pretourCount + posttourCount) + ' are valid');
    // report.info.push('Of which ' + validRows.length + ' are meaningful');
    report.addInfo('Of which ' + validRows.length + ' are meaningful');
    return validRows;
}

async function processDrivingLogExcelFileV2(year: number, report: DatasetErrorReport, callback) {
    let workbook = new Excel.Workbook();

    let filePath = getDrivingLogLocalPath(year);
    // Skip if filePath is empty - don't go into errCallback, subsequent steps might still be possible
    if (filePath == '') {
        normalLog('  processDrivingLogExcelFileV2 skip because of empty file path');
        callback([]);
        return;
    }

    await workbook.xlsx.readFile(filePath);

    let rows = extractAndResolveDrivingLogRowsV2(workbook, report);
    let validRows = getValidDrivingLogRowsV2(rows, report);

    callback(validRows);
}

function extractAndResolveDrivingLogRowsV2(workbook, report: DatasetErrorReport): any[] {
    let worksheet = workbook.getWorksheet('Program vožnje');

    let rowObjs: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber == 1) {
            return;
        }

        let date = extractCellRawValue(workbook, worksheet, row, 1);
        let tourCode = extractCellRawValue(workbook, worksheet, row, 2);
        let dayNumber = extractCellRawValue(workbook, worksheet, row, 3);
        let destination = extractCellRawValue(workbook, worksheet, row, 4);
        let vehicle1 = extractCellRawValue(workbook, worksheet, row, 9);
        let driver1 = extractCellRawValue(workbook, worksheet, row, 10);
        let vehicle2 = extractCellRawValue(workbook, worksheet, row, 13);
        let driver2 = extractCellRawValue(workbook, worksheet, row, 14);
        let carrier1 = extractCellRawValue(workbook, worksheet, row, 17);
        let type1 = extractCellRawValue(workbook, worksheet, row, 18);
        let carrier2 = extractCellRawValue(workbook, worksheet, row, 20);
        let type2 = extractCellRawValue(workbook, worksheet, row, 21);
        let carrier3 = extractCellRawValue(workbook, worksheet, row, 23);
        let type3 = extractCellRawValue(workbook, worksheet, row, 24);
        let notice = extractCellRawValue(workbook, worksheet, row, 11);

        rowObjs.push({
            rowNumber: rowNumber,
            date: date,
            tourCode: tourCode,
            tourName: '',
            startDate: null,
            dayNumber: dayNumber,
            destination: destination,
            vehicle1: vehicle1,
            driver1: driver1,
            vehicle2: vehicle2,
            driver2: driver2,
            vehicle3: null,
            driver3: null,
            carrier1: carrier1,
            type1: type1,
            carrier2: carrier2,
            type2: type2,
            carrier3: carrier3,
            type3: type3,
            notice: notice
        });
    });

    // report.info.push('Extracted all DRIVING_LOG row objects: ' + rowObjs.length + ' in total');
    report.addInfo('Extracted all DRIVING_LOG row objects: ' + rowObjs.length + ' in total');
    return rowObjs;
}

function getValidDrivingLogRowsV2(rows, report: DatasetErrorReport): any[] {
    // let tourCodePattern = /^([^-]*)-([0-9]{2})\/([0-9]{2})\/([0-9]{2})$/;
    let tourCodePattern = /^([^]*)-(\d{2})\/(\d{2})\/(\d{2})$/;
    let tourNameDic: Map<string, string> = new Map([
        ['SEMK-DE', 'SEMK - DE']
    ]);

    let validRows: any[] = [];
    let pretourCount = 0;
    let posttourCount = 0;
    let emptyRowCount = 0;
    rows.forEach((row: {
        rowNumber: number,
        date: Date,
        tourCode: string,
        tourName: string,
        startDate: Date,
        dayNumber: String,
        destination: string,
        vehicle1: string,
        driver1: String,
        vehicle2: string,
        driver2: String,
        vehicle3: string,
        driver3: String,
        carrier1: String,
        type1: String,
        carrier2: String,
        type2: String,
        carrier3: String,
        type3: String,
        notice: string
    }) => {
        // Check if date is not null
        if (row.date == null) {
            return;
        }

        // Skip special values
        if (row.tourCode.toLowerCase() == 'Vrbovanje Kandidata'.toLowerCase()) {
            return;
        }

        // Check if tourCode represents a <name>-<date> combination
        let tourCodeMatch = row.tourCode.match(tourCodePattern);
        if (tourCodeMatch == null) {
            // Serious error - Include it in the report
            // report.errors.push(unexpectedValueMsg('TourCode', row.tourCode, row.rowNumber, null));
            report.addError(unexpectedValueMsg('TourCode', row.tourCode, row.rowNumber, null))
            return;
        }

        // Extract tour name and date
        row.tourName = tourCodeMatch[1];
        row.startDate = new Date(2000 + Number(tourCodeMatch[4]), Number(tourCodeMatch[3]) - 1, Number(tourCodeMatch[2]));

        // Perform renaming - some tours have slightly different names between this and the other excel file
        if (tourNameDic.has(row.tourName)) {
            row.tourName = tourNameDic.get(row.tourName);
        }

        // Remove pretour rows
        // TODO: incorporate pretour driving log rows
        if (row.dayNumber == null || row.dayNumber == 'pre' || (!isNaN(parseInt(row.dayNumber.valueOf())) && parseInt(row.dayNumber.valueOf()) <= 0)) {
            pretourCount++;
            return;
        }

        // Remove post tour rows
        // TODO: incorporate post tour driving log rows
        if (row.dayNumber == 'post') {
            posttourCount++;
            return;
        }

        // Remove rows with no content - no need to insert rows with no information since this table is gonna be optional in a LEFT JOIN operation
        // Rows with special values ['Bez Vozila', '-'] are better represented as null in the DB
        if ((row.vehicle1 == null || row.vehicle1.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.vehicle1 == '-')
            && (row.driver1 == null || row.driver1.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.driver1 == '-')
            && (row.vehicle2 == null || row.vehicle2.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.vehicle2 == '-')
            && (row.driver2 == null || row.driver2.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.driver2 == '-')
            && (row.vehicle3 == null || row.vehicle3.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.vehicle3 == '-')
            && (row.driver3 == null || row.driver3.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.driver3 == '-')
            && (row.carrier1 == null || row.carrier1.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.carrier1 == '-')
            && (row.type1 == null || row.type1.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.type1 == '-')
            && (row.carrier2 == null || row.carrier2.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.carrier2 == '-')
            && (row.type2 == null || row.type2.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.type2 == '-')
            && (row.carrier3 == null || row.carrier3.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.carrier3 == '-')
            && (row.type3 == null || row.type3.toLowerCase() == 'Bez Vozila'.toLowerCase() || row.type3 == '-')
            && row.notice == null
        ) {
            emptyRowCount++;
            return;
        }

        // Use this row
        validRows.push(row);
    });

    // report.info.push('Of which ' + (validRows.length + emptyRowCount + pretourCount + posttourCount) + ' are valid');
    report.addInfo('Of which ' + (validRows.length + emptyRowCount + pretourCount + posttourCount) + ' are valid');
    // report.info.push('Of which ' + validRows.length + ' are meaningful');
    report.addInfo('Of which ' + validRows.length + ' are meaningful');
    return validRows;
}

// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// Tour Schedule functions
const processTourScheduleExcelFileVersions = {
    2022: processTourScheduleExcelFileV1,
    2023: processTourScheduleExcelFileV2,
    2024: processTourScheduleExcelFileV3,
};

function processTourScheduleExcelFileSelectVersion(report: DatasetErrorReport, callback, errCallback) {
    getYear(year => processTourScheduleExcelFileVersions[year](year, report, callback), errCallback);
}

async function processTourScheduleExcelFileV1(year: number, report: DatasetErrorReport, callback) {
    let workbook = new Excel.Workbook();

    let filePath = getTourScheduleLocalPath(year);
    // Skip if filePath is empty - don't go into errCallback, subsequent steps might still be possible
    if (filePath == '') {
        normalLog('  processTourScheduleExcelFileV1 skip because of empty file path');
        callback([]);
        return;
    }

    await workbook.xlsx.readFile(filePath);

    let rows = extractAndResolveExcelRowsV1(workbook, report);

    let tours = consolidateRowsIntoTourObjectsV1(rows, report);

    callback(tours);
}

// Read through the rows of the Excel workbook and extract useful fields, resolving any links
function extractAndResolveExcelRowsV1(workbook, report: DatasetErrorReport): any[] {
    let worksheet = workbook.getWorksheet('link');

    let rowObjs: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
        // Ignore header row
        if (rowNumber == 1) {
            return;
        }

        let operator = extractCellRawValue(workbook, worksheet, row, 1);
        let tour = extractCellRawValue(workbook, worksheet, row, 2);
        let departNum = extractCellRawValue(workbook, worksheet, row, 3);
        let hotel1 = extractCellRawValue(workbook, worksheet, row, 4);
        let hotel2 = extractCellRawValue(workbook, worksheet, row, 5);
        let activities = extractCellRawValue(workbook, worksheet, row, 6);
        let dayNum = extractCellRawValue(workbook, worksheet, row, 7);
        let arrDate = extractCellRawValue(workbook, worksheet, row, 8);
        let depDate = extractCellRawValue(workbook, worksheet, row, 9);
        let status = extractCellRawValue(workbook, worksheet, row, 10);
        let junkString = extractCellRawValue(workbook, worksheet, row, 13);

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
            junkString: junkString,
            pax: null,
            paxRaw: null,
            roomSingle: null,
            roomDouble: null,
            roomTwin: null,
            roomTriple: null,
            roomApt: null,
            roomStaff: null,
            dump: null,
            leader1: null,
            leader2: null,
        });
    });

    // report.info.push('Extracted all row objects: ' + rowObjs.length + ' in total');
    report.addInfo('Extracted all row objects: ' + rowObjs.length + ' in total');
    return rowObjs;
}

function consolidateRowsIntoTourObjectsV1(rows, report: DatasetErrorReport): any[] {
    let tours: any[] = [];
    let currentTour: any = null;
    let preCollection: any[] = [];

    rows.forEach((row, rowNumber) => {
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
                    // Unexpected post tour day - no existing tour to append to - Serious error - Include it in the report
                    // report.errors.push(atRowMessage('Unexpected post tour day, could not find to which tour to attach it to', row.rowNumber, null));
                    report.addError(atRowMessage('Neočekivan \'post tour\' red, nije jasno kojoj turi pripada', row.rowNumber, null));
                    return;
                }

                // TODO: handle post days, instead of just shooting them into an array and then ignoring them
                currentTour.postDays.push(row);
                return;
            } else {
                // Unexpected value - skip row - Serious error - Include it in the report
                // report.errors.push(unexpectedValueMsg('depart.', row.departNum, row.rowNumber, null));
                report.addError(unexpectedValueMsg('depart.', row.departNum, row.rowNumber, null));
                return;
            }
        } else if (typeof row.dayNum != 'number') {
            if (typeof row.dayNum != 'string') {
                // Unexpected dayNum value - Serious error - Include it in the report
                // report.errors.push(unexpectedValueMsg('day', JSON.stringify(row.dayNum), row.rowNumber, null));
                report.addError(unexpectedValueMsg('day', JSON.stringify(row.dayNum), row.rowNumber, null));
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
                // Unexpected dayNum value - Serious error - Include it in the report
                // report.errors.push(unexpectedValueMsg('day', JSON.stringify(row.dayNum), row.rowNumber, null));
                report.addError(unexpectedValueMsg('day', JSON.stringify(row.dayNum), row.rowNumber, null));
                return;
            }
        } else if (typeof row.departNum != 'number') {
            // Unexpected value - skip row - Serious error - Include it in the report
            // report.errors.push(unexpectedValueMsg('depart.', row.departNum, row.rowNumber, null));
            report.addError(unexpectedValueMsg('depart.', row.departNum, row.rowNumber, null));
            return;
        }

        // Extract guest number and tour guide name from junkString
        if (row.junkString != null && typeof row.junkString == 'string') {
            let paxRegex = /^(?:\([0-9]+\)\s+)?([0-9\(\)\+ ]+)pax/;
            let guideRegex = /^(?:\([0-9]+\)\s+)?[0-9\(\)\+ ]+pax\s+\S+\s+(.+)$/;

            let paxMatch = row.junkString.match(paxRegex);
            let guideMatch = row.junkString.match(guideRegex);

            if (paxMatch != null) {
                // Three cases: normal: 2pax; parentheses: (3)2pax; sum: 2+1pax
                // For parentheses case, use the number outside
                // For sum case, calculate the sum
                let parenthesesNumRegex = /^\([0-9]+\)\s*([0-9]+)$/;
                let sumRegex = /^([0-9]+)\s*\+\s*([0-9]+)$/;

                let paxString = paxMatch[1].trim();
                row.paxRaw = paxMatch[0];

                let parenthesesNumMatch = paxString.match(parenthesesNumRegex);
                let sumMatch = paxString.match(sumRegex);

                if (parenthesesNumMatch != null) {
                    row.pax = Number(parenthesesNumMatch[1])
                } else if (sumMatch != null) {
                    row.pax = Number(sumMatch[1]) + Number(sumMatch[2]);
                } else {
                    row.pax = Number(paxString);
                }

                if (row.pax == null || isNaN(row.pax)) {
                    // Don't need to report this since guestNum field is not important - used for stats right now
                    // Less serious error - Include it in the report as warning
                    // report.warnings.push(atRowMessage('Unsuccessful string to number cast. Tried to cast \'' + paxMatch[1] + '\'', firstDay.rowNumber, null));
                    report.addWarning(atRowMessage('Unsuccessful string to number cast. Tried to cast \'' + paxMatch[1] + '\'', row.rowNumber, null));
                }
            } else {
                // Less serious error - Include it in the report as warning
                // report.warnings.push(unexpectedValueMsg('pax / rooms / structure', firstDay.junkString, firstDay.rowNumber, null));
                report.addWarning(unexpectedValueMsg('pax / rooms / structure', row.junkString, row.rowNumber, null));
            }

            if (guideMatch != null) {
                row.leader1 = guideMatch[1].trim();
            } else {
                // Less serious error - Include it in the report as warning
                // report.warnings.push(atRowMessage('Could not find guide in \'' + 'pax / rooms / structure' + '\' <' + firstDay.junkString + '>', firstDay.rowNumber, null));
                report.addWarning(atRowMessage('Could not find guide in \'' + 'pax / rooms / structure' + '\' <' + row.junkString + '>', row.rowNumber, null));
            }
        } else {
            // Ignore null values
            if (row.junkString != null) {
                // Less serious error - Include it in the report as warning
                // report.warnings.push(unexpectedValueMsg('pax / rooms / structure', firstDay.junkString, firstDay.rowNumber, null));
                report.addWarning(unexpectedValueMsg('pax / rooms / structure', row.junkString, row.rowNumber, null));
            }
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
            // Less serious error - Include it in the report as warning
            // report.warnings.push(unexpectedValueMsg('status', firstDay.status, firstDay.rowNumber, ' interpreted as \'' + 'nepoznat' + '\''));
            report.addWarning(unexpectedValueMsg('status', firstDay.status, firstDay.rowNumber, ' interpreted as \'' + 'nepoznat' + '\''));
            tour.status = statusUnknown;
        } else if (firstDay.status.slice(0, 5) == 'potvr') {
            // Special exception - 'pax / rooms / structure' column says it's cancelled -> then it's cancelled ???
            if (firstDay.junkString != null && typeof firstDay.junkString == 'string' && firstDay.junkString.slice(0, 5) == 'otkaz') {
                // Less serious error - Include it in the report as warning
                // report.warnings.push(atRowMessage('Registering tour as cancelled only cause the \'pax / rooms / structure\' column says so', firstDay.rowNumber, null));
                report.addWarning(atRowMessage('Registering tour as cancelled only cause the \'pax / rooms / structure\' column says so', firstDay.rowNumber, null));
                tour.status = statusCanceled;
            } else {
                tour.status = statusConfirmed;
            }
        } else if (firstDay.status.slice(0, 5) == 'otkaz') {
            tour.status = statusCanceled;
        } else if (firstDay.status.slice(0, 5) == 'nepoz') {
            tour.status = statusUnknown;
        } else {
            // Less serious error - Include it in the report as warning
            // report.warnings.push(unexpectedValueMsg('status', firstDay.status, firstDay.rowNumber, ' interpreted as \'' + 'nepoznat' + '\''));
            report.addWarning(unexpectedValueMsg('status', firstDay.status, firstDay.rowNumber, ' interpreted as \'' + 'nepoznat' + '\''));
            tour.status = statusUnknown;
        }

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
                        // Serious error - Include it in the report
                        // report.errors.push(missingValueMsg('arr date', day.rowNumber, null));
                        report.addError(missingValueMsg('arr date', day.rowNumber, null));
                    }
                    tour.invalidData = true;
                }
            }
            if (arrDate != null && !(arrDate instanceof Date)) {
                if (tour.status == statusConfirmed) {
                    // Serious error - Include it in the report
                    // report.errors.push(unexpectedValueMsg('arr date', dateHelpers.getDDMMYYYYslashed(arrDate), day.rowNumber, ' expected a Date'));
                    report.addError(unexpectedValueMsg('arr date', dateHelpers.getDDMMYYYYslashed(arrDate), day.rowNumber, ' očekivan je datum'));
                }
                tour.invalidData = true;
            } else if (expectedDate != null && (arrDate.getFullYear() != expectedDate.getFullYear()
                || arrDate.getMonth() != expectedDate.getMonth() || arrDate.getDate() != expectedDate.getDate())
            ) {
                if (tour.status == statusConfirmed) {
                    let expectedDateString = dateHelpers.getDDMMYYYYslashed(expectedDate);
                    let foundDateString = dateHelpers.getDDMMYYYYslashed(arrDate);
                    // Serious error - Include it in the report
                    // report.errors.push(unexpectedValueMsg('arr date', foundDateString, day.rowNumber, '. Expected <' + expectedDateString + '>. Issue might be at \'' + 'depart.' + '\''));
                    report.addError(unexpectedValueMsg('arr date', foundDateString, day.rowNumber, '. Očekivana vrednost: <' + expectedDateString + '>. Problem može biti i u \'' + 'depart.' + '\' koloni.'));
                }
                tour.invalidData = true;
            }
            if (arrDate != null && arrDate instanceof Date) {
                expectedDate = new Date(arrDate);
                expectedDate.setDate(arrDate.getDate() + 1);
            }
        });

        // Copy 'pax','paxRaw' from previous day (except for last day)
        // Makes sure stats are correct for hotel stays, since the junkString field is empty for those
        if (!tour.invalidData && tour.days.length > 2) {
            for (let i = 1; i < tour.days.length - 1; i++) {
                let currDay = tour.days[i];
                let prevDay = tour.days[i - 1];

                if (currDay.hotel1 == null && currDay.hotel2 == null && currDay.pax_raw == null) {
                    currDay.paxRaw = prevDay.paxRaw;

                    if (currDay.pax == null) {
                        currDay.pax = prevDay.pax;
                    }
                }
            }
        }
    });

    let validTours = tours.filter(t => !t.invalidData);
    let invalidTours = tours.filter(t => t.invalidData);
    let confirmedTours = validTours.filter(t => t.status == statusConfirmed);
    let canceledTours = validTours.filter(t => t.status == statusCanceled);
    let unknownTours = validTours.filter(t => t.status == statusUnknown);

    // report.info.push('Created all tour objects: ' + tours.length + ' in total');
    // report.info.push('Of which ' + validTours.length + ' have valid data');
    // report.info.push('Of which ' + confirmedTours.length + ' are confirmed, ' + canceledTours.length + ' are canceled, and ' + unknownTours.length + ' are unknown');
    report.addInfo('Created all tour objects: ' + tours.length + ' in total');
    report.addInfo('Of which ' + validTours.length + ' have valid data');
    report.addInfo('Of which ' + confirmedTours.length + ' are confirmed, ' + canceledTours.length + ' are canceled, and ' + unknownTours.length + ' are unknown');

    return validTours;
}

async function processTourScheduleExcelFileV2(year: number, report: DatasetErrorReport, callback) {
    let workbook = new Excel.Workbook();

    let filePath = getTourScheduleLocalPath(year);
    // Skip if filePath is empty - don't go into errCallback, subsequent steps might still be possible
    if (filePath == '') {
        normalLog('  processTourScheduleExcelFileV2 skip because of empty file path');
        callback([]);
        return;
    }

    await workbook.xlsx.readFile(filePath);

    let rows = extractAndResolveExcelRowsV2(workbook, report);

    let tours = consolidateRowsIntoTourObjectsV2(rows, report);

    callback(tours);
}

// Read through the rows of the Excel workbook and extract useful fields, resolving any links
function extractAndResolveExcelRowsV2(workbook, report: DatasetErrorReport): any[] {
    let worksheet = workbook.getWorksheet('link');

    let rowObjs: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
        // Ignore header row
        if (rowNumber == 1) {
            return;
        }

        let operator = extractCellRawValue(workbook, worksheet, row, 1);
        let aceOrg = extractCellRawValue(workbook, worksheet, row, 2);
        let tour = extractCellRawValue(workbook, worksheet, row, 3);
        let departNum = extractCellRawValue(workbook, worksheet, row, 4);
        let hotel1 = extractCellRawValue(workbook, worksheet, row, 5);
        let hotel2 = extractCellRawValue(workbook, worksheet, row, 6);
        let activities = extractCellRawValue(workbook, worksheet, row, 7);
        let dayNum = extractCellRawValue(workbook, worksheet, row, 8);
        let arrDate = extractCellRawValue(workbook, worksheet, row, 9);
        let depDate = extractCellRawValue(workbook, worksheet, row, 10);
        let status = extractCellRawValue(workbook, worksheet, row, 11);
        let paxRaw = extractCellRawValue(workbook, worksheet, row, 14);
        let roomSingle = extractCellRawValue(workbook, worksheet, row, 15);
        let roomDouble = extractCellRawValue(workbook, worksheet, row, 16);
        let roomTwin = extractCellRawValue(workbook, worksheet, row, 17);
        let roomTriple = extractCellRawValue(workbook, worksheet, row, 18);
        let roomApt = extractCellRawValue(workbook, worksheet, row, 19);
        let roomStaff = extractCellRawValue(workbook, worksheet, row, 20);
        let leader1 = extractCellRawValue(workbook, worksheet, row, 21);
        let leader2 = extractCellRawValue(workbook, worksheet, row, 22);

        rowObjs.push({
            rowNumber: rowNumber,
            operator: operator,
            aceOrg: aceOrg,
            tour: tour,
            departNum: departNum,
            dayNum: dayNum,
            hotel1: hotel1,
            hotel2: hotel2,
            activities: activities,
            arrDate: arrDate,
            depDate: depDate,
            status: status,
            pax: null,
            paxRaw: paxRaw,
            roomSingle: roomSingle,
            roomDouble: roomDouble,
            roomTwin: roomTwin,
            roomTriple: roomTriple,
            roomApt: roomApt,
            roomStaff: roomStaff,
            leader1: leader1,
            leader2: leader2,
        });
    });

    // report.info.push('Extracted all row objects: ' + rowObjs.length + ' in total');
    report.addInfo('Extracted all row objects: ' + rowObjs.length + ' in total');
    return rowObjs;
}

function consolidateRowsIntoTourObjectsV2(rows, report: DatasetErrorReport): any[] {
    let tours: any[] = [];
    let currentTour: any = null;
    let preCollection: any[] = [];

    rows.forEach((row, rowNumber) => {
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
                    // Unexpected post tour day - no existing tour to append to - Serious error - Include it in the report
                    // report.errors.push(atRowMessage('Unexpected post tour day, could not find to which tour to attach it to', row.rowNumber, null));
                    report.addError(atRowMessage('Neočekivan \'post tour\' red, nije jasno kojoj turi pripada', row.rowNumber, null));
                    return;
                }

                // TODO: handle post days, instead of just shooting them into an array and then ignoring them
                currentTour.postDays.push(row);
                return;
            } else {
                // Unexpected value - skip row - Serious error - Include it in the report
                // report.errors.push(unexpectedValueMsg('depart.', row.departNum, row.rowNumber, null));
                report.addError(unexpectedValueMsg('depart.', row.departNum, row.rowNumber, null));
                return;
            }
        } else if (typeof row.dayNum != 'number') {
            if (typeof row.dayNum != 'string') {
                // Unexpected dayNum value - Serious error - Include it in the report
                // report.errors.push(unexpectedValueMsg('day', JSON.stringify(row.dayNum), row.rowNumber, null));
                report.addError(unexpectedValueMsg('day', JSON.stringify(row.dayNum), row.rowNumber, null));
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
                // Unexpected dayNum value - Serious error - Include it in the report
                // report.errors.push(unexpectedValueMsg('day', JSON.stringify(row.dayNum), row.rowNumber, null));
                report.addError(unexpectedValueMsg('day', JSON.stringify(row.dayNum), row.rowNumber, null));
                return;
            }
        } else if (typeof row.departNum != 'number') {
            // Unexpected value - skip row - Serious error - Include it in the report
            // report.errors.push(unexpectedValueMsg('depart.', row.departNum, row.rowNumber, null));
            report.addError(unexpectedValueMsg('depart.', row.departNum, row.rowNumber, null));
            return;
        }

        // Compute guest number if possible (paxRaw sometimes contains non-number values)
        // Three cases: normal: 2; parentheses: 2 (3); sum: 2+1
        // For parentheses case, use the number outside
        // For sum case, calculate the sum
        if (row.paxRaw != null) {
            if (typeof row.paxRaw == 'number') {
                row.pax = row.paxRaw;
            } else if (typeof row.paxRaw == 'string') {
                let parenthesesRegex = /^(\d+)\s*\(\d+\)$/;
                let sumRegex = /^(\d+)\s*\+\s*(\d+)$/;

                let paxString = row.paxRaw.trim();

                let parenthesesMatch = paxString.match(parenthesesRegex);
                let sumMatch = paxString.match(sumRegex);

                if (parenthesesMatch != null) {
                    row.pax = Number(parenthesesMatch[1]);
                } else if (sumMatch != null) {
                    row.pax = Number(sumMatch[1]) + Number(sumMatch[2]);
                }
            }
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
            // Less serious error - Include it in the report as warning
            // report.warnings.push(unexpectedValueMsg('status', firstDay.status, firstDay.rowNumber, ' interpreted as \'' + 'nepoznat' + '\''));
            report.addWarning(unexpectedValueMsg('status', firstDay.status, firstDay.rowNumber, ' interpreted as \'' + 'nepoznat' + '\''));
            tour.status = statusUnknown;
        } else if (firstDay.status.slice(0, 5) == 'potvr') {
            tour.status = statusConfirmed;
        } else if (firstDay.status.slice(0, 5) == 'otkaz') {
            tour.status = statusCanceled;
        } else if (firstDay.status.slice(0, 5) == 'nepoz') {
            tour.status = statusUnknown;
        } else {
            // Less serious error - Include it in the report as warning
            // report.warnings.push(unexpectedValueMsg('status', firstDay.status, firstDay.rowNumber, ' interpreted as \'' + 'nepoznat' + '\''));
            report.addWarning(unexpectedValueMsg('status', firstDay.status, firstDay.rowNumber, ' interpreted as \'' + 'nepoznat' + '\''));
            tour.status = statusUnknown;
        }

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
                        // Serious error - Include it in the report
                        // report.errors.push(missingValueMsg('arr date', day.rowNumber, null));
                        report.addError(missingValueMsg('arr date', day.rowNumber, null));
                    }
                    tour.invalidData = true;
                }
            }
            if (arrDate != null && !(arrDate instanceof Date)) {
                if (tour.status == statusConfirmed) {
                    // Serious error - Include it in the report
                    // report.errors.push(unexpectedValueMsg('arr date', dateHelpers.getDDMMYYYYslashed(arrDate), day.rowNumber, ' expected a Date'));
                    report.addError(unexpectedValueMsg('arr date', dateHelpers.getDDMMYYYYslashed(arrDate), day.rowNumber, ' očekivan je datum'));
                }
                tour.invalidData = true;
            } else if (expectedDate != null && (arrDate.getFullYear() != expectedDate.getFullYear()
                || arrDate.getMonth() != expectedDate.getMonth() || arrDate.getDate() != expectedDate.getDate())
            ) {
                if (tour.status == statusConfirmed) {
                    let expectedDateString = dateHelpers.getDDMMYYYYslashed(expectedDate);
                    let foundDateString = dateHelpers.getDDMMYYYYslashed(arrDate);
                    // Serious error - Include it in the report
                    // report.errors.push(unexpectedValueMsg('arr date', foundDateString, day.rowNumber, '. Expected <' + expectedDateString + '>. Issue might be at \'' + 'depart.' + '\''));
                    report.addError(unexpectedValueMsg('arr date', foundDateString, day.rowNumber, '. Očekivana vrednost: <' + expectedDateString + '>. Problem može biti i u \'' + 'depart.' + '\' koloni.'));
                }
                tour.invalidData = true;
            }
            if (arrDate != null && arrDate instanceof Date) {
                expectedDate = new Date(arrDate);
                expectedDate.setDate(arrDate.getDate() + 1);
            }
        });

        // Copy some fields to last day - tour leader, pax
        // For some reason these are missing for the last day of the tour
        if (!tour.invalidData && tour.days.length > 1) {
            let lastDay = tour.days[tour.days.length - 1];
            let dayBefore = tour.days[tour.days.length - 2];

            // Copy RAW pax - Don't copy 'pax' since that would mess up the overnight stat calculation
            if (lastDay.paxRaw == null) {
                lastDay.paxRaw = dayBefore.paxRaw;
            }
            // Copy tour leaders
            if (lastDay.leader1 == null) {
                lastDay.leader1 = dayBefore.leader1;
            }
            if (lastDay.leader2 == null) {
                lastDay.leader2 = dayBefore.leader2;
            }
        }
    });

    let validTours = tours.filter(t => !t.invalidData);
    let invalidTours = tours.filter(t => t.invalidData);
    let confirmedTours = validTours.filter(t => t.status == statusConfirmed);
    let canceledTours = validTours.filter(t => t.status == statusCanceled);
    let unknownTours = validTours.filter(t => t.status == statusUnknown);

    // report.info.push('Created all tour objects: ' + tours.length + ' in total');
    // report.info.push('Of which ' + validTours.length + ' have valid data');
    // report.info.push('Of which ' + confirmedTours.length + ' are confirmed, ' + canceledTours.length + ' are canceled, and ' + unknownTours.length + ' are unknown');
    report.addInfo('Created all tour objects: ' + tours.length + ' in total');
    report.addInfo('Of which ' + validTours.length + ' have valid data');
    report.addInfo('Of which ' + confirmedTours.length + ' are confirmed, ' + canceledTours.length + ' are canceled, and ' + unknownTours.length + ' are unknown');

    return validTours;
}

async function processTourScheduleExcelFileV3(year: number, report: DatasetErrorReport, callback) {
    let workbook = new Excel.Workbook();

    let filePath = getTourScheduleLocalPath(year);
    // Skip if filePath is empty - don't go into errCallback, subsequent steps might still be possible
    if (filePath == '') {
        normalLog('  processTourScheduleExcelFileV3 skip because of empty file path');
        callback([]);
        return;
    }

    await workbook.xlsx.readFile(filePath);

    let rows = extractAndResolveExcelRowsV3(workbook, report);

    let tours = consolidateRowsIntoTourObjectsV2(rows, report);

    callback(tours);
}

// Read through the rows of the Excel workbook and extract useful fields, resolving any links
function extractAndResolveExcelRowsV3(workbook, report: DatasetErrorReport): any[] {
    let worksheet = workbook.getWorksheet('link');

    let rowObjs: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
        // Ignore header row
        if (rowNumber == 1) {
            return;
        }

        let operator = extractCellRawValue(workbook, worksheet, row, 1);
        let aceOrg = extractCellRawValue(workbook, worksheet, row, 2);
        let tour = extractCellRawValue(workbook, worksheet, row, 3);
        let departNum = extractCellRawValue(workbook, worksheet, row, 4);
        let hotel1 = extractCellRawValue(workbook, worksheet, row, 5);
        let hotel2 = extractCellRawValue(workbook, worksheet, row, 6);
        let activities1 = extractCellRawValue(workbook, worksheet, row, 7);
        let activities2 = extractCellRawValue(workbook, worksheet, row, 8);
        let dayNum = extractCellRawValue(workbook, worksheet, row, 9);
        let arrDate = extractCellRawValue(workbook, worksheet, row, 10);
        let depDate = extractCellRawValue(workbook, worksheet, row, 11);
        let status = extractCellRawValue(workbook, worksheet, row, 12);
        let paxRaw = extractCellRawValue(workbook, worksheet, row, 16);
        let roomSingle = extractCellRawValue(workbook, worksheet, row, 17);
        let roomDouble = extractCellRawValue(workbook, worksheet, row, 18);
        let roomTwin = extractCellRawValue(workbook, worksheet, row, 19);
        let roomTriple = extractCellRawValue(workbook, worksheet, row, 20);
        let roomApt = extractCellRawValue(workbook, worksheet, row, 21);
        let roomStaff = extractCellRawValue(workbook, worksheet, row, 22);
        let leader1 = extractCellRawValue(workbook, worksheet, row, 24);

        rowObjs.push({
            rowNumber: rowNumber,
            operator: operator,
            aceOrg: aceOrg,
            tour: tour,
            departNum: departNum,
            dayNum: dayNum,
            hotel1: hotel1,
            hotel2: hotel2,
            activities: (activities1 != null && activities2 != null ? activities1 + ', ' + activities2 : activities1), // lazy workaround for now, table is still empty, I don't wanna put in work now
            arrDate: arrDate,
            depDate: depDate,
            status: status,
            pax: null,
            paxRaw: paxRaw,
            roomSingle: roomSingle,
            roomDouble: roomDouble,
            roomTwin: roomTwin,
            roomTriple: roomTriple,
            roomApt: roomApt,
            roomStaff: roomStaff,
            leader1: leader1,
            leader2: null,
        });
    });

    // report.info.push('Extracted all row objects: ' + rowObjs.length + ' in total');
    report.addInfo('Extracted all row objects: ' + rowObjs.length + ' in total');
    return rowObjs;
}

// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// Helper functions
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
    processTourScheduleExcelFileSelectVersion,
    processDrivingLogExcelFileSelectVersion
}