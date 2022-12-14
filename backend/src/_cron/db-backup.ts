import { Secrets } from "../../config/secrets";
import { updateFile } from "../_helpers/drive-helpers";
import { normalLog, timeStampLog } from "../_helpers/logger";
import { CronConfig } from "./cron-config";

declare var require: any;
let cron = require('node-cron');
let fs = require('fs');
let exec = require('child_process').exec;

let driveHelpers = require('../_helpers/drive-helpers');

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
    timeStampLog(''
        + 'Database Backup Cron Job \'' + cronName + '\' FAILED!'
        + '\n\tCause in next line:'
    );
    normalLog(err);
}

function reportSuccess(cronName) {
    timeStampLog('Database Backup Cron Job \'' + cronName + '\' successfully finished');
}

function reportDisabled(cronName) {
    timeStampLog('Database Backup Cron Job \'' + cronName + '\' is disabled - did not run');
}

function reportInvalidConfig(cronName) {
    timeStampLog('Database Backup Cron Job \'' + cronName + '\' FAILED! Config is invalid');
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

function updateDriveBackup(srcFilePath: string, targetFileId, successCallback, errCallback) {
    updateFile(srcFilePath, targetFileId, successCallback, errCallback);
}

function runBackup(cronName, typeEnabledKey, pathsKey, fileIdsKey, indexKey) {
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
    if (backupConfig[indexKey] >= backupConfig[pathsKey].length || backupConfig[indexKey] >= backupConfig[fileIdsKey].length) {
        backupConfig[indexKey] = 0;
    }

    // Run job
    let index = backupConfig[indexKey];
    let localFilePath = backupConfig[pathsKey][index];
    let driveFileId = backupConfig[fileIdsKey][index];

    createBackup(localFilePath, () => {
        updateDriveBackup(localFilePath, driveFileId, () => {
            // Update config for next run
            backupConfig[indexKey] = (backupConfig[indexKey] + 1) % backupConfig[pathsKey].length;

            // Save json config - index was updated
            tryAndSaveJsonConfig();
            
            reportSuccess(cronName);
        }, err => reportFailure(cronName, err));
    }, err => reportFailure(cronName, err));
}

// Perform backup every day at 03:00 - middle of the night
cron.schedule('0 3 * * *', () => {
    runBackup('DAILY', 'daily', 'dailyBackupPaths', 'dailyBackupFileIds', 'dailyPathIndex');
});

// Perform backup every tuesday at 02:55 - middle of the night
cron.schedule('55 2 * * tue', () => {
    runBackup('WEEKLY', 'weekly', 'weeklyBackupPaths', 'weeklyBackupFileIds', 'weeklyPathIndex');
});

function testBackup() {
    runBackup('TEST', 'daily', 'dailyBackupPaths', 'dailyBackupFileIds', 'dailyPathIndex');
}

export {
    testBackup
}