declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let excelHelpers = require('../_helpers/excel-helpers');
let driveHelpers = require('../_helpers/drive-helpers');

// Make sure only 'admin' users have access
router.use(userCheckers.assertIsAdmin);

// List routes here
router.get('/process_excel_test_file', (req, res) => {
    // excelHelpers.testExcelFunction(res);
    console.log('MAINTENANCE');
    res.sendStatus(500);
});

router.get('/process_driving_log', (req, res) => {
    // excelHelpers.testDrivingLog(res);
    console.log('MAINTENANCE');
    res.sendStatus(500);
})

router.get('/list_drive_files', (req, res) => {
    driveHelpers.listFiles(res);
});

router.get('/download_tour_schedule', (req, res) => {
    driveHelpers.downloadTourSchedule(() => {
        console.log('Downloaded tour schedule file :)');
        res.sendStatus(200);
    }, err => {
        console.log(err);
        res.sendStatus(500);
    });
});

router.get('/download_driving_log', (req, res) => {
    driveHelpers.downloadDrivingLog(() => {
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