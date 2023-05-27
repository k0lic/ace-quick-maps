import { Environment } from "../../config/environment";
import { Constants } from "../constants";
import { atRowMessage, DatasetErrorReport } from "../_helpers/dataset-error-report";
import { normalLog, timeStampLog } from "../_helpers/logger";
import { beginTransaction, commitTransaction, executeMultipleQueries, executeQueryInTransaction, rollbackTransaction } from "../_helpers/query-helpers";
import { CronConfig } from "./cron-config";

declare var require: any;
let cron = require('node-cron');
let fs = require('fs');

let driveHelpers = require('../_helpers/drive-helpers');
let dateHelpers = require('../_helpers/date-helpers');
let excelHelpers = require('../_helpers/excel-helpers');
let mailHelpers = require('../_helpers/mail-helpers');

// Setup config object
let refreshConfig = CronConfig.DATASET_REFRESHER.DEFAULT_CONFIG;
tryAndReadJsonConfig();

function tryAndReadJsonConfig() {
    try {
        // Try to read json config file
        let rawdata = fs.readFileSync(CronConfig.DATASET_REFRESHER.FILE_PATH);
        refreshConfig = JSON.parse(rawdata);
    } catch (err) {
        // If reading json config failed, continue with current config
    }
}

function tryAndSaveJsonConfig() {
    try {
        // Try to write to json config file
        let data = JSON.stringify(refreshConfig);
        fs.writeFileSync(CronConfig.DATASET_REFRESHER.FILE_PATH, data);
    } catch (err) {
        // If writing to json config failed, continue without saving config
    }
}

// Structure Functions
function yell() {
    timeStampLog('HELLO');
}

function runRefresh() {
    // Check if cron job is enabled
    if (!refreshConfig.enabled) {
        timeStampLog('Dataset Refresher Cron Job is disabled - did not run');
        return;
    }

    // Create report
    let ogReport: DatasetErrorReport = new DatasetErrorReport();

    // First step - fetch Tour-Schedule excel file from drive
    jobStep(refreshConfig.fetchTourSchedule, ogReport, driveHelpers.downloadTourSchedule, null, (conn, report) => {
        // Second step - fetch Driving-Log excel file from drive
        jobStep(refreshConfig.fetchDrivingLog, report, driveHelpers.downloadDrivingLog, null, (conn, report) => {
            // Start transaction
            beginTransaction(conn => {
                // Third step - update DB with Tour-Schedule values
                jobStep(refreshConfig.updateTourSchedule, report, updateTourSchedule, conn, (conn, report) => {
                    // Fourth step - update DB with Driving-Log values
                    jobStep(refreshConfig.updateDrivingLog, report, updateDrivingLog, conn, (conn, report) => {
                        // Commit transaction
                        commitTransaction(conn, () => {
                            // Log successful job
                            timeStampLog(''
                                + 'Dataset Refresher Cron Job successfully finished '
                                + '\n\tWith settings: (fetchSchedule:' + refreshConfig.fetchTourSchedule + ', fetchDrivingLog:' + refreshConfig.fetchDrivingLog
                                + ', updateSchedule:' + refreshConfig.updateTourSchedule + ', updateDrivingLog:' + refreshConfig.updateDrivingLog + ')'
                            );
                        }, reportFailure);
                    }, rollback);
                }, rollback);
            }, reportFailure);
        }, (conn, err) => reportFailure(err));
    }, (conn, err) => reportFailure(err));
}

function jobStep(stepEnabled, report: DatasetErrorReport, jobFunc, conn: any, nextStep, errCallback) {
    if (!stepEnabled) {
        // skip to next step
        nextStep(conn, report);
        return;
    }

    jobFunc(conn, report, nextStep, errCallback);
}

function rollback(conn: any, err) {
    rollbackTransaction(conn, err, reportFailure);
}

function reportFailure(err) {
    timeStampLog(''
        + 'Dataset refresher cron job FAILED!'
        + '\n\tWith settings: (fetchSchedule:' + refreshConfig.fetchTourSchedule + ', fetchDrivingLog:' + refreshConfig.fetchDrivingLog
        + ', updateSchedule:' + refreshConfig.updateTourSchedule + ', updateDrivingLog:' + refreshConfig.updateDrivingLog + ')'
        + '\n\tCause in next line:'
    );
    normalLog(err);
}

function sendReport(resourceName: string, ownerEmailAddress: string, report: DatasetErrorReport) {
    if (report.hasErrors() == false) {
        // Don't send report if there are no errors - don't want to spam people
        return;
    }

    if (ownerEmailAddress == null) {
        console.log('Could not send report, owner of resource \'' + resourceName + '\' not found');
        return;
    }

    // Only send the email if there are errors
    mailHelpers.sendMailConsoleLog(ownerEmailAddress, Constants.MAIL_TEMPLATES.ERROR_REPORT.SUBJECT, report.renderHtml(resourceName));
}

// Meat functions
async function updateTourSchedule(conn: any, report: DatasetErrorReport, successCallback, errCallback) {
    // Only send report to the first component that fires errors, since later components depend on the previous ones
    let noErrorsOnEntry = report.hasErrors() == false;

    excelHelpers.processTourScheduleExcelFileSelectVersion(report, tours => {
        if (tours.length == 0) {
            successCallback(conn, report);
            return;
        }

        updateDatabaseWithTours(conn, tours, report, (conn, report) => {
            if (noErrorsOnEntry) {
                // Send report before calling the callback
                sendReport('Raspored tura', Environment.RESOURCE_OWNERS.TOUR_SCHEDULE, report);
            }

            successCallback(conn, report);
        }, (conn, err, report) => {
            // Do we send a report on failure? I think it's better not to - 
            // The report will not contain the reason for the failure, any errors in the report are minor compared to the one that failed the DB update
            errCallback(conn, err);
        });
    }, err => errCallback(conn, err));
}

// NOTICE: When opening a excel file that has a filter on Exceljs crashes, so I added a really stupid fix, to a piece of code I don't understand.
//          Basically, I removed a 'throw' so no error is reported.
//          ~\node_modules\exceljs\lib\xlsx\xform\table\auto-filter-xform.js AutoFilterXform::parseClose the part where an error is thrown, just comment it out
// (TODO: fix in a better way? Not sure if possible)
async function updateDrivingLog(conn: any, report: DatasetErrorReport, successCallback, errCallback) {
    // Only send report to the first component that fires errors, since later components depend on the previous ones
    let noErrorsOnEntry = report.hasErrors() == false;

    excelHelpers.processDrivingLogExcelFileSelectVersion(report, rows => {
        if (rows.length == 0) {
            successCallback(conn, report);
            return;
        }

        updateDatabaseWithDrivingLog(conn, rows, report, (conn, report) => {
            if (noErrorsOnEntry) {
                // Send report before calling the callback
                sendReport('DRIVING LOG', Environment.RESOURCE_OWNERS.DRIVING_LOG, report);
            }

            successCallback(conn, report);
        }, (conn, err, report) => {
            // Do we send a report on failure? I think it's better not to - 
            // The report will not contain the reason for the failure, any errors in the report are minor compared to the one that failed the DB update
            errCallback(conn, err);
        });
    }, err => errCallback(conn, err));
}

function updateDatabaseWithTours(conn: any, tours, report: DatasetErrorReport, successCallback, errCallback): void {
    // TODO: don't just copy these 3 into every function, come on man...
    const statusUnknown = 'unknown';
    const statusConfirmed = 'confirmed';
    const statusCanceled = 'canceled';

    // Excel contains program names, while database uses auto-generated keys for programs
    let currentYearProgramsQuery = 'SELECT * FROM programs p, current_year cy WHERE cy.current = p.id_year';
    executeQueryInTransaction(conn, currentYearProgramsQuery, [], (conn, programs) => {
        // Create mapping from program name (eg. MCG1) to program id (eg. 31)
        let programNameMap: Map<string, number> = new Map();
        programs.forEach(p => {
            programNameMap.set(p.name, p.idprogram);
        });

        // tour_days and activities are set to Cascade on Delete
        let cleanupQuery = 'DELETE '
            + 'FROM tours '
            + 'WHERE program_id IN ( '
            + '  SELECT p.idprogram '
            + '  FROM programs p, current_year cy '
            + '  WHERE p.id_year = cy.current '
            + ')';

        let insertToursQueryString = 'INSERT INTO tours (excel_row_number, program_id, start_date, end_date, depart_num, status) VALUES ?';

        let insertTourQueryValues: any[] = [[]];
        tours.forEach(t => {
            insertTourQueryValues[0].push([
                t.rowNumber,
                programNameMap.get(String(t.name)),
                dateHelpers.getYYYYMMDDdashed(t.startDate),
                dateHelpers.getYYYYMMDDdashed(t.endDate),
                t.departNum,
                t.status
            ]);
        });

        executeQueryInTransaction(conn, cleanupQuery, [], (conn, rows) => {
            executeQueryInTransaction(conn, insertToursQueryString, insertTourQueryValues, (conn, rows) => {

                let fetchNewToursQuery = 'SELECT * '
                    + 'FROM tours t '
                    + 'WHERE t.program_id IN ( '
                    + '  SELECT p.idprogram '
                    + '  FROM programs p, current_year cy '
                    + '  WHERE p.id_year = cy.current '
                    + ') '
                    + 'ORDER BY t.excel_row_number';
                executeQueryInTransaction(conn, fetchNewToursQuery, [], (conn, dbTours) => {

                    let insertTourDaysQueryString = 'INSERT INTO tour_days (tour_id, day_number, date, hotel1, hotel2, pax, pax_raw, room_single, room_double, room_twin, room_triple, room_apt, room_staff, tour_lead1, tour_lead2, dump) VALUES ?';

                    let insertTourDaysQueryValues: any[] = [[]];
                    tours.forEach((t, tIndex) => {
                        t.days.forEach(d => {
                            insertTourDaysQueryValues[0].push([
                                dbTours[tIndex].id,
                                d.dayNum,
                                dateHelpers.getYYYYMMDDdashed(d.arrDate),
                                d.hotel1,
                                d.hotel2,
                                d.pax,
                                d.paxRaw,
                                d.roomSingle,
                                d.roomDouble,
                                d.roomTwin,
                                d.roomTriple,
                                d.roomApt,
                                d.roomStaff,
                                d.leader1,
                                d.leader2,
                                d.dump
                            ]);
                        });
                    });

                    executeQueryInTransaction(conn, insertTourDaysQueryString, insertTourDaysQueryValues, (conn, rows) => {

                        let fetchNewTourDaysQuery = 'SELECT * '
                            + 'FROM tour_days td '
                            + 'WHERE td.tour_id IN ( '
                            + '  SELECT t.id '
                            + '  FROM tours t '
                            + '  WHERE t.program_id IN ( '
                            + '    SELECT p.idprogram '
                            + '    FROM programs p, current_year cy '
                            + '    WHERE p.id_year = cy.current '
                            + '  ) '
                            + ')';
                        executeQueryInTransaction(conn, fetchNewTourDaysQuery, [], (conn, dbTourDays) => {

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
                                executeQueryInTransaction(
                                    conn,
                                    insertActivitiesQueryString, insertActivitiesQueryValues,
                                    (conn, rows) => successCallback(conn, report),
                                    (conn, err) => errCallback(conn, err, report));
                            } else {
                                successCallback(conn, report);
                            }
                        }, (conn, err) => errCallback(conn, err, report));
                    }, (conn, err) => errCallback(conn, err, report));
                }, (conn, err) => errCallback(conn, err, report));
            }, (conn, err) => errCallback(conn, err, report));
        }, (conn, err) => errCallback(conn, err, report));
    }, (conn, err) => errCallback(conn, err, report));
}

function updateDatabaseWithDrivingLog(conn, rows, report: DatasetErrorReport, successCallback, errCallback): void {
    // Driving log contains tour instance names, while database uses auto-generated keys for tour objects
    let currentYearToursQuery = ''
        + 'SELECT t.id as id, p.name as `name`, t.start_date as `start_date` '
        + 'FROM tours t '
        + 'INNER JOIN programs p '
        + 'ON t.program_id = p.idprogram '
        + 'INNER JOIN current_year cy '
        + 'ON p.id_year = cy.current';
    executeQueryInTransaction(conn, currentYearToursQuery, [], (conn, tours) => {
        // Create mapping from tour instance name (eg. MCG1-01/01/22) to program id (eg. 31)
        let tourIdMap: Map<string, number> = new Map();
        tours.forEach(t => {
            let tourInstanceName = t.name + '-' + dateHelpers.getDDMMYYslashed(t.start_date);
            tourIdMap.set(tourInstanceName, t.id);
        });

        // Cleanup old driving log rows
        let cleanupQuery = 'DELETE '
            + 'FROM tour_days_driving_log '
            + 'WHERE tour_id IN ( '
            + '  SELECT t.id '
            + '  FROM tours t, programs p, current_year cy '
            + '  WHERE t.program_id = p.idprogram and p.id_year = cy.current '
            + ')';

        // Insert new driving log rows
        let insertDrivingLogQueryString = 'INSERT INTO tour_days_driving_log (excel_row_number, tour_id, day_number, date, vehicle1, driver1, vehicle2, driver2, vehicle3, driver3, carrier1, type1, carrier2, type2, carrier3, type3, notice) VALUES ?';

        let insertDrivingLogQueryValues: any[] = [[]];
        rows.forEach(r => {
            // Check if we can fetch the tour id for this driving log row
            let tourId = tourIdMap.get(r.tourName + '-' + dateHelpers.getDDMMYYslashed(r.startDate));
            if (tourId == null) {
                // Could not fetch tour id - Serious error - Include it in the report
                // report.errors.push(atRowMessage('Could not find tour <' + r.tourCode + '> in database. Tour appears in driving-log', r.rowNumber, '. Check the name and the date of the tour.'));
                report.addError(atRowMessage('Tura <' + r.tourCode + '> se ne nalazi u bazi, a pojavljuje se', r.rowNumber, '. Proveri naziv i datum.'));
                return;
            }

            insertDrivingLogQueryValues[0].push([
                r.rowNumber,
                tourId,
                r.dayNumber,
                r.date,
                r.vehicle1,
                r.driver1,
                r.vehicle2,
                r.driver2,
                r.vehicle3,
                r.driver3,
                r.carrier1,
                r.type1,
                r.carrier2,
                r.type2,
                r.carrier3,
                r.type3,
                r.notice
            ]);
        });

        executeMultipleQueries(
            conn,
            [cleanupQuery, insertDrivingLogQueryString],
            [[], insertDrivingLogQueryValues],
            conn => successCallback(conn, report),
            (conn, err) => errCallback(conn, err, report)
        );
    }, (conn, err) => errCallback(conn, err, report));
}

// Jobs
// cron.schedule("*/10 * * * * *", yell);

// Perform refresh every day at 03:05 - middle of the night
cron.schedule('5 3 * * *', () => {
    // Read json config, maybe changes were made since last run
    tryAndReadJsonConfig();

    // Run job
    runRefresh();

    // Saving is not really needed for this cron job, since the settings don't change, except when manually changed
    tryAndSaveJsonConfig();
});

function testRefresh() {
    // Read json config, maybe changes were made since last run
    tryAndReadJsonConfig();

    // Run job
    runRefresh();

    // Saving is not really needed for this cron job, since the settings don't change, except when manually changed
    tryAndSaveJsonConfig();
}

export {
    testRefresh
}
