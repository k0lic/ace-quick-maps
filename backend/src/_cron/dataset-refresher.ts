import { Environment } from "../../config/environment";
import { Constants } from "../constants";
import { atRowMessage, DatasetErrorReport } from "../_helpers/dataset-error-report";
import { CronConfig } from "./cron-config";

declare var require: any;
let cron = require('node-cron');
let fs = require('fs');

let queryHelpers = require('../_helpers/query-helpers');
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
    console.log('[' + new Date() + '] HELLO ');
}

function runRefresh() {
    // Check if cron job is enabled
    if (!refreshConfig.enabled) {
        console.log('[' + new Date() + '] Dataset Refresher Cron Job is disabled - did not run');
        return;
    }

    // Create report
    let ogReport: DatasetErrorReport = new DatasetErrorReport();

    // First step - fetch Tour-Schedule excel file from drive
    jobStep(refreshConfig.fetchTourSchedule, ogReport, driveHelpers.downloadTourSchedule, report => {
        // Second step - fetch Driving-Log excel file from drive
        jobStep(refreshConfig.fetchDrivingLog, report, driveHelpers.downloadDrivingLog, report => {
            // Start transaction
            queryHelpers.beginTransaction(null, () => {
                // Third step - update DB with Tour-Schedule values
                jobStep(refreshConfig.updateTourSchedule, report, updateTourSchedule, report => {
                    // Fourth step - update DB with Driving-Log values
                    jobStep(refreshConfig.updateDrivingLog, report, updateDrivingLog, report => {
                        // Commit transaction
                        queryHelpers.coreCommitTransaction(() => {
                            // Log successful job
                            console.log(''
                                + '[' + new Date() + '] Dataset Refresher Cron Job successfully finished '
                                + '\n\tWith settings: (fetchSchedule:' + refreshConfig.fetchTourSchedule + ', fetchDrivingLog:' + refreshConfig.fetchDrivingLog 
                                + ', updateSchedule:' + refreshConfig.updateTourSchedule + ', updateDrivingLog:' + refreshConfig.updateDrivingLog + ')'
                            );
                        }, reportFailure);
                    }, rollback);
                }, rollback);
            }, reportFailure);
        }, reportFailure);
    }, reportFailure);
}

function jobStep(stepEnabled, report: DatasetErrorReport, jobFunc, nextStep, errCallback) {
    if (!stepEnabled) {
        // skip to next step
        nextStep(report);
        return;
    }

    jobFunc(report, nextStep, errCallback);
}

function rollback(err) {
    queryHelpers.coreRollbackTransaction(err, reportFailure);
}

function reportFailure(err) {
    console.log(''
        + '[' + new Date() + '] Dataset refresher cron job FAILED!'
        + '\n\tWith settings: (fetchSchedule:' + refreshConfig.fetchTourSchedule + ', fetchDrivingLog:' + refreshConfig.fetchDrivingLog 
        + ', updateSchedule:' + refreshConfig.updateTourSchedule + ', updateDrivingLog' + refreshConfig.updateDrivingLog + ')'
        + '\n\tCause in next line:'
    );
    console.log(err);
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
async function updateTourSchedule(report: DatasetErrorReport, successCallback, errCallback) {
    // Only send report to the first component that fires errors, since later components depend on the previous ones
    let noErrorsOnEntry = report.hasErrors() == false;

    let tours = await excelHelpers.processTourScheduleExcelFile(report);
    updateDatabaseWithTours(tours, report, report => {
        if (noErrorsOnEntry) {
            // Send report before calling the callback
            sendReport('Raspored tura', Environment.RESOURCE_OWNERS.TOUR_SCHEDULE, report);
        }

        successCallback(report);
    }, (err, report) => {
        // Do we send a report on failure? I think it's better not to - 
        // The report will not contain the reason for the failure, any errors in the report are minor compared to the one that failed the DB update
        errCallback(err);
    });
}

async function updateDrivingLog(report: DatasetErrorReport, successCallback, errCallback) {
    // Only send report to the first component that fires errors, since later components depend on the previous ones
    let noErrorsOnEntry = report.hasErrors() == false;

    let rows = await excelHelpers.processDrivingLogExcelFile(report);
    updateDatabaseWithDrivingLog(rows, report, report => {
        if (noErrorsOnEntry) {
            // Send report before calling the callback
            sendReport('DRIVING LOG', Environment.RESOURCE_OWNERS.DRIVING_LOG, report);
        }

        successCallback(report);
    }, (err, report) => {
        // Do we send a report on failure? I think it's better not to - 
        // The report will not contain the reason for the failure, any errors in the report are minor compared to the one that failed the DB update
        errCallback(err);
    });
}

function updateDatabaseWithTours(tours, report: DatasetErrorReport, successCallback, errCallback): void {
    // TODO: don't just copy these 3 into every function, come on man...
    const statusUnknown = 'unknown';
    const statusConfirmed = 'confirmed';
    const statusCanceled = 'canceled';

    // Excel contains program names, while database uses auto-generated keys for programs
    let allProgramsQuery = 'SELECT * FROM programs';
    queryHelpers.coreExecuteQueryWithCallback(allProgramsQuery, [], programs => {
        // Create mapping from program name (eg. MCG1) to program id (eg. 31)
        let programNameMap: Map<string, number> = new Map();
        programs.forEach(p => {
            programNameMap.set(p.name, p.idprogram);
        });

        // tour_days and activities are set to Cascade on Delete
        let cleanupQuery = 'DELETE FROM tours';
        
        let insertToursQueryString = 'INSERT INTO tours (excel_row_number, program_id, start_date, end_date, depart_num, tour_guide, guest_number, guests_raw, status) VALUES ?';

        let insertTourQueryValues: any[] = [[]];
        tours.forEach(t => {
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

        queryHelpers.coreExecuteQueryWithCallback(cleanupQuery, [], rows => {
            queryHelpers.coreExecuteQueryWithCallback(insertToursQueryString, insertTourQueryValues, rows => {

                let fetchNewToursQuery = 'SELECT * FROM tours ORDER BY excel_row_number';
                queryHelpers.coreExecuteQueryWithCallback(fetchNewToursQuery, [], dbTours => {

                    let insertTourDaysQueryString = 'INSERT INTO tour_days (tour_id, day_number, date, hotel1, hotel2) VALUES ?';

                    let insertTourDaysQueryValues: any[] = [[]];
                    tours.forEach((t, tIndex) => {
                        t.days.forEach(d => {
                            insertTourDaysQueryValues[0].push([
                                dbTours[tIndex].id,
                                d.dayNum,
                                dateHelpers.getYYYYMMDDdashed(d.arrDate),
                                d.hotel1,
                                d.hotel2
                            ]);
                        });
                    });

                    queryHelpers.coreExecuteQueryWithCallback(insertTourDaysQueryString, insertTourDaysQueryValues, rows => {

                        let fetchNewTourDaysQuery = 'SELECT * FROM tour_days';
                        queryHelpers.coreExecuteQueryWithCallback(fetchNewTourDaysQuery, [], dbTourDays => {

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
                                queryHelpers.coreExecuteQueryWithCallback(
                                    insertActivitiesQueryString, insertActivitiesQueryValues, rows => successCallback(report), err => errCallback(err, report));
                            } else {
                                successCallback(report);
                            }
                        }, err => errCallback(err, report));
                    }, err => errCallback(err, report));
                }, err => errCallback(err, report));
            }, err => errCallback(err, report));
        }, err => errCallback(err, report));
    }, err => errCallback(err, report));
}

function updateDatabaseWithDrivingLog(rows, report: DatasetErrorReport, successCallback, errCallback): void {
    // Driving log contains tour instance names, while database uses auto-generated keys for tour objects
    let allToursQuery = 'SELECT t.id as id, p.name as `name`, t.start_date as `start_date` '
                        + 'FROM tours t '
                        + 'INNER JOIN programs p '
                        + 'ON t.program_id = p.idprogram';
    queryHelpers.coreExecuteQueryWithCallback(allToursQuery, [], tours => {
        // Create mapping from tour instance name (eg. MCG1-01/01/22) to program id (eg. 31)
        let tourIdMap: Map<string, number> = new Map();
        tours.forEach(t => {
            let tourInstanceName = t.name + '-' + dateHelpers.getDDMMYYslashed(t.start_date);
            tourIdMap.set(tourInstanceName, t.id);
        });

        // Cleanup old driving log rows
        let cleanupQuery = 'DELETE FROM tour_days_driving_log';

        // Insert new driving log rows
        let insertDrivingLogQueryString = 'INSERT INTO tour_days_driving_log (excel_row_number, tour_id, day_number, date, vehicle1, vehicle2, vehicle3, notice) VALUES ?';

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
                r.vehicle2,
                r.vehicle3,
                r.notice
            ]);
        });

        queryHelpers.coreExecuteQueries(
            [cleanupQuery, insertDrivingLogQueryString],
            [[], insertDrivingLogQueryValues],
            () => successCallback(report),
            err => errCallback(err, report)
        );
    }, err => errCallback(err, report));
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
    updateTourSchedule,
    updateDrivingLog,
    testRefresh
}
