import { Secrets } from "../../config/secrets";
import { CronConfig } from "./cron-config";

declare var require: any;
let cron = require('node-cron');
let fs = require('fs');
let exec = require('child_process').exec;

let queryHelpers = require('../_helpers/query-helpers');
let driveHelpers = require('../_helpers/drive-helpers');
let dateHelpers = require('../_helpers/date-helpers');
let excelHelpers = require('../_helpers/excel-helpers');

// Setup config object
let backupConfig = CronConfig.DB_BACKUP.DEFAULT_CONFIG;
tryAndReadJsonConfig();

function tryAndReadJsonConfig() {
    try {
        // Try to read json config file
        let rawdata = fs.readFileSync(CronConfig.DB_BACKUP.FILE_PATH);
        backupConfig = JSON.parse(rawdata);
    } catch (err) {
        // If reading json config failed, continue with current config
    }
}

function tryAndSaveJsonConfig() {
    try {
        // Try to write to json config file
        let data = JSON.stringify(backupConfig);
        fs.writeFileSync(CronConfig.DB_BACKUP.FILE_PATH, data);
    } catch (err) {
        // If writing to json config failed, continue without saving config
    }
}

// Structure functions
function reportFailure(cronName, err) {
    console.log(''
        + '[' + new Date() + '] Database Backup Cron Job \'' + cronName + '\' FAILED!'
        + '\n\tCause in next line:'
    );
    console.log(err);
}

function reportSuccess(cronName) {
    console.log('[' + new Date() + '] Database Backup Cron Job \'' + cronName + '\' successfully finished');
}

function reportDisabled(cronName) {
    console.log('[' + new Date() + '] Database Backup Cron Job \'' + cronName + '\' is disabled - did not run');
}

function reportInvalidConfig(cronName) {
    console.log('[' + new Date() + '] Database Backup Cron Job \'' + cronName + '\' FAILED! Config is invalid');
}

// Meat functions
function createBackup(fileName, successCallback, errCallback) {
    let cmd = 'mysqldump -u ' + Secrets.MY_SQL.USER + ' -p' + Secrets.MY_SQL.PASSWORD + ' ' + Secrets.MY_SQL.DATABASE + ' > ' + fileName;
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            errCallback(err);
        } else {
            successCallback();
        }
    });
}

function uploadBackup(fileName, successCallback, errCallback) {
    driveHelpers.uploadFile(fileName, successCallback, errCallback);
}

function runBackup(cronName, typeEnabledKey, pathsKey, indexKey) {
    // Read json config, maybe changes were made since last run
    tryAndReadJsonConfig();

    // Check if enabled
    if (!backupConfig.enabled || !backupConfig[typeEnabledKey]) {
        reportDisabled(cronName);
        return;
    }

    // Prep config
    if (backupConfig[pathsKey].length == 0) {
        reportInvalidConfig(cronName);
        return;
    }
    if (backupConfig[indexKey] >= backupConfig[pathsKey].length) {
        backupConfig[indexKey] = 0;
    }

    // Run job
    let fileName = backupConfig[pathsKey][backupConfig[indexKey]];

    createBackup(fileName, () => {
        uploadBackup(fileName, () => {
            reportSuccess(cronName);
        }, err => reportFailure(cronName, err));
    }, err => reportFailure(cronName, err));

    // Update config for next run
    backupConfig[indexKey] = (backupConfig[indexKey] + 1) % backupConfig[pathsKey].length;

    // Save json config - index was updated
    tryAndSaveJsonConfig();
}

// Perform backup every day at 03:00 - middle of the night
cron.schedule('0 3 * * *', () => {
    runBackup('DAILY', 'daily', 'dailyBackupPaths', 'dailyPathIndex');
});

// Perform backup every tuesday at 02:55 - middle of the night
// TODO: every tuesday?
cron.schedule('55 2 * * *', () => {
    runBackup('WEEKLY', 'weekly', 'weeklyBackupPaths', 'weeklyPathIndex');
});

function testBackup() {
    runBackup('TEST', 'daily', 'dailyBackupPaths', 'dailyPathIndex');
}

export {
    testBackup
}