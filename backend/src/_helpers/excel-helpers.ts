import { Environment } from "../../config/environment";
import { atRowMessage, DatasetErrorReport, missingValueMsg, unexpectedValueMsg } from "./dataset-error-report";

declare var require: any;
let Excel = require('exceljs');

let dateHelpers = require('./date-helpers');

// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// Driving Log functions
async function processDrivingLogExcelFile(report: DatasetErrorReport) {
    let workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(Environment.FILE_PATHS.DRIVING_LOG);

    let rows = extractAndResolveDrivingLogRows(workbook, report);
    let validRows = getValidDrivingLogRows(rows, report);

    return validRows;
}

function extractAndResolveDrivingLogRows(workbook, report: DatasetErrorReport): any[] {
    let worksheet = workbook.getWorksheet('Program vožnje');

    let rowObjs: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
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

    // report.info.push('Extracted all DRIVING_LOG row objects: ' + rowObjs.length + ' in total');
    report.addInfo('Extracted all DRIVING_LOG row objects: ' + rowObjs.length + ' in total');
    return rowObjs;
}

function getValidDrivingLogRows(rows, report: DatasetErrorReport): any[] {
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
        if (row.destination.slice(0, 3) == 'Pre') {
            // console.log('Is this a pretour row?\t' + row.destination + ' at ' + row.rowNumber);
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

// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// ************************************************************************************************************************************* //
// Tour Schedule functions
async function processTourScheduleExcelFile(report: DatasetErrorReport) {
    let workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(Environment.FILE_PATHS.TOUR_SCHEDULE);

    let rows = extractAndResolveExcelRows(workbook, report);

    let tours = consolidateRowsIntoTourObjects(rows, report);

    return tours;
}

// Read through the rows of the Excel workbook and extract useful fields, resolving any links
function extractAndResolveExcelRows(workbook, report: DatasetErrorReport): any[] {
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

    // report.info.push('Extracted all row objects: ' + rowObjs.length + ' in total');
    report.addInfo('Extracted all row objects: ' + rowObjs.length + ' in total');
    return rowObjs;
}

function consolidateRowsIntoTourObjects(rows, report: DatasetErrorReport): any[] {
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

        // Extract guest number and tour guide name from junkString - use the first day
        if (firstDay.junkString != null && typeof firstDay.junkString == 'string') {
            let paxRegex    = /^(?:\([0-9]+\)\s+)?([0-9\(\)\+ ]+)pax/;
            let guideRegex  = /^(?:\([0-9]+\)\s+)?[0-9\(\)\+ ]+pax\s+\S+\s+(.+)$/;

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
                    // Don't need to report this since guestNum field is not important - used for stats right now
                    // Less serious error - Include it in the report as warning
                    // report.warnings.push(atRowMessage('Unsuccessful string to number cast. Tried to cast \'' + paxMatch[1] + '\'', firstDay.rowNumber, null));
                    report.addWarning(atRowMessage('Unsuccessful string to number cast. Tried to cast \'' + paxMatch[1] + '\'', firstDay.rowNumber, null));
                }
            } else {
                if (tour.status == statusConfirmed) {
                    // Don't report - don't have a reason, just repeating what I said for tour guide :shrug:
                    // Less serious error - Include it in the report as warning
                    // report.warnings.push(unexpectedValueMsg('pax / rooms / structure', firstDay.junkString, firstDay.rowNumber, null));
                    report.addWarning(unexpectedValueMsg('pax / rooms / structure', firstDay.junkString, firstDay.rowNumber, null));
                }
            }
            if (guideMatch != null) {
                tour.tourGuide = guideMatch[1].trim();
            } else {
                if (tour.status == statusConfirmed) {
                    // Don't report - tours in the future that are confirmed don't have a tour guide assigned yet
                    // Less serious error - Include it in the report as warning
                    // report.warnings.push(atRowMessage('Could not find guide in \'' + 'pax / rooms / structure' + '\' <' + firstDay.junkString + '>', firstDay.rowNumber, null));
                    report.addWarning(atRowMessage('Could not find guide in \'' + 'pax / rooms / structure' + '\' <' + firstDay.junkString + '>', firstDay.rowNumber, null));
                }
            }
        } else {
            // Ignore null values
            if (firstDay.junkString != null && tour.status == statusConfirmed) {
                // Don't report - tours in the future that are confirmed don't have a tour guide assigned yet
                // Less serious error - Include it in the report as warning
                // report.warnings.push(unexpectedValueMsg('pax / rooms / structure', firstDay.junkString, firstDay.rowNumber, null));
                report.addWarning(unexpectedValueMsg('pax / rooms / structure', firstDay.junkString, firstDay.rowNumber, null));
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

            lastDay = day.dayNum;
        });
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
    processTourScheduleExcelFile,
    processDrivingLogExcelFile
}