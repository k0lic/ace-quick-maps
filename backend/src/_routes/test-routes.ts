import { DatasetErrorReport } from "../_helpers/dataset-error-report";

declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let excelHelpers = require('../_helpers/excel-helpers');
let driveHelpers = require('../_helpers/drive-helpers');
let backupCron = require('../_cron/db-backup');
let refresherCron = require('../_cron/dataset-refresher');

// Make sure only 'admin' users have access
router.use(userCheckers.assertIsAdmin);

// List routes here
router.get('/process_excel_test_file', (req, res) => {
    // excelHelpers.testExcelFunction(res);
    // backupCron.testBackup();
    // res.sendStatus(200);

    // let report: DatasetErrorReport = newDatasetErrorReport();
    //
    // refresherCron.updateTourSchedule(report, report => {
    //     console.log('SUCCESSFUL TEST');
    //     res.sendStatus(200);
    // }, err => {
    //     console.log(err);
    //     console.log('FAILED TEST');
    //     res.sendStatus(500);
    // });

    refresherCron.testRefresh();
    res.sendStatus(200);
});

router.get('/process_driving_log', (req, res) => {
    // console.log('MAINTENANCE');
    // res.sendStatus(500);
    let report: DatasetErrorReport = new DatasetErrorReport();

    refresherCron.updateDrivingLog(report, report => {
        console.log('SUCCESSFUL TEST');
        res.sendStatus(200);
    }, err => {
        console.log(err);
        console.log('FAILED TEST');
        res.sendStatus(500);
    });
})

router.get('/list_drive_files', (req, res) => {
    driveHelpers.listFiles(res);
});

router.get('/download_tour_schedule', (req, res) => {
    let report: DatasetErrorReport = new DatasetErrorReport();

    driveHelpers.downloadTourSchedule(report, report => {
        console.log('Downloaded tour schedule file :)');
        res.sendStatus(200);
    }, err => {
        console.log(err);
        res.sendStatus(500);
    });
});

router.get('/download_driving_log', (req, res) => {
    let report: DatasetErrorReport = new DatasetErrorReport();

    driveHelpers.downloadDrivingLog(report, report => {
        console.log('Downloaded driving log file :)');
        res.sendStatus(200);
    }, err => {
        console.log(err);
        res.sendStatus(500);
    });
});

// Export router
export {
    router
}