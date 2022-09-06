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
function createBackup(fileName) {
    exec('mysqldump -u ' + Secrets.MY_SQL.USER + ' -p' + Secrets.MY_SQL.PASSWORD + ' ' + Secrets.MY_SQL.DATABASE + ' > ' + fileName);
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

    createBackup(fileName);

    uploadBackup(fileName, () => {
        reportSuccess(cronName);
    }, err => reportFailure(cronName, err));

    // Update config for next run
    backupConfig[indexKey] = (backupConfig[indexKey] + 1) % backupConfig[pathsKey].length;

    // Save json config - index was updated
    tryAndSaveJsonConfig();
}

// Perform backup every day at 03:00 - middle of the night
cron.schedule('0 3 * * *', () => {
    runBackup('DAILY', 'daily', 'dailyBackupPaths', 'dailyPathIndex');
    // let cronName = 'DAILY';

    // // Read json config, maybe changes were made since last run
    // tryAndReadJsonConfig();

    // // Check if enabled
    // if (!backupConfig.enabled || !backupConfig.daily) {
    //     reportDisabled(cronName);
    //     return;
    // }

    // // Prep config
    // if (backupConfig.dailyBackupPaths.length == 0) {
    //     reportInvalidConfig(cronName);
    //     return;
    // }
    // if (backupConfig.dailyPathIndex >= backupConfig.dailyBackupPaths.length) {
    //     backupConfig.dailyPathIndex = 0;
    // }

    // // Run job
    // if (backupConfig.enabled && backupConfig.daily) {
    //     let fileName = backupConfig.dailyBackupPaths[backupConfig.dailyPathIndex];

    //     createBackup(fileName);

    //     uploadBackup(fileName, () => {
    //         reportSuccess(cronName);
    //     }, err => reportFailure(cronName, err));
    // }

    // // Update config for next run
    // backupConfig.dailyPathIndex = (backupConfig.dailyPathIndex + 1) % backupConfig.dailyBackupPaths.length;

    // // Saving is not really needed for this cron job, since the settings don't change, except when manually changed
    // tryAndSaveJsonConfig();
});

// Perform backup every tuesday at 02:55 - middle of the night
cron.schedule('55 2 * * *', () => {
    runBackup('WEEKLY', 'weekly', 'weeklyBackupPaths', 'weeklyPathIndex');
    // let cronName = 'WEEKLY';

    // // Read json config, maybe changes were made since last run
    // tryAndReadJsonConfig();

    // // Check if enabled
    // if (!backupConfig.enabled || !backupConfig.weekly) {
    //     reportDisabled(cronName);
    //     return;
    // }

    // // Prep config
    // if (backupConfig.weeklyBackupPaths.length == 0) {
    //     reportInvalidConfig(cronName);
    //     return;
    // }
    // if (backupConfig.weeklyPathIndex >= backupConfig.weeklyBackupPaths.length) {
    //     backupConfig.weeklyPathIndex = 0;
    // }

    // // Run job
    // if (backupConfig.enabled && backupConfig.weekly) {
    //     let fileName = backupConfig.weeklyBackupPaths[backupConfig.weeklyPathIndex];

    //     createBackup(fileName);

    //     uploadBackup(fileName, () => {
    //         reportSuccess(cronName);
    //     }, err => reportFailure(cronName, err));
    // }

    // // Update config for next run
    // backupConfig.weeklyPathIndex = (backupConfig.weeklyPathIndex + 1) % backupConfig.weeklyBackupPaths.length;

    // // Saving is not really needed for this cron job, since the settings don't change, except when manually changed
    // tryAndSaveJsonConfig();
});

function testBackup() {
    runBackup('TEST', 'daily', 'dailyBackupPaths', 'dailyPathIndex');
}

export {
    testBackup
}