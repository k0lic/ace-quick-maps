import { Environment } from "../../config/environment";
import { Secrets } from "../../config/secrets";
import { DatasetErrorReport } from "./dataset-error-report";
import { normalLog } from "./logger";
import { getDrivingLogDriveFileId, getDrivingLogLocalPath, getTourScheduleDriveFileId, getTourScheduleLocalPath, getYear } from "./version-helper";

declare var require: any;
let fs = require('fs');
let { google } = require('googleapis');

// Setup authorization client
let oauth2Client = new google.auth.OAuth2(
    Secrets.GOOGLE_DRIVE.CLIENT_ID,
    Secrets.GOOGLE_DRIVE.CLIENT_SECRET,
    Secrets.GOOGLE_DRIVE.REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: Secrets.GOOGLE_DRIVE.REFRESH_TOKEN
});

// Setup drive object
let drive = google.drive({
    version: 'v3',
    auth: oauth2Client
});

// Functions
// Lists files visible to the quick maps google account - use it when a file id needs changing
async function listFiles(res) {
    try {
        let response = await drive.files.list({});
        let listResults = response.data;

        console.log('File list:');
        console.log(listResults);
        res.sendStatus(200);
    } catch (err) {
        normalLog(err);
        res.sendStatus(500);
    }
}

function downloadFromDrive(fileId, fileDestPath, successCallback, errCallback) {
    // Skip if parameters are empty - don't go into errCallback, subsequent steps might still be possible
    if (fileId == '' || fileDestPath == '') {
        normalLog('  downloadFromDrive skip because of empty parameters (driveFileId, fileDestPath)');
        successCallback();
        return;
    }

    return drive.files.get({
        fileId: fileId,
        alt: 'media'
    }, {
        responseType: 'stream'
    }).then(result => {
        return new Promise((resolve, reject) => {
            let dest = fs.createWriteStream(fileDestPath);

            result.data
                .on('end', successCallback)
                .on('error', errCallback)
                .pipe(dest);
        });
    });
}

function downloadTourSchedule(conn: any, report: DatasetErrorReport, successCallback, errCallback) {
    getYear(year => {
        downloadFromDrive(getTourScheduleDriveFileId(year), getTourScheduleLocalPath(year), () => successCallback(conn, report), err => errCallback(conn, err));
    }, err => errCallback(conn, err));
}

function downloadDrivingLog(conn: any, report: DatasetErrorReport, successCallback, errCallback) {
    getYear(year => {
        downloadFromDrive(getDrivingLogDriveFileId(year), getDrivingLogLocalPath(year), () => successCallback(conn, report), err => errCallback(conn, err));
    }, err => errCallback(conn, err));
}

async function uploadFile(filePath: string, successCallback, errCallback) {
    try {
        let lastPos = filePath.lastIndexOf(Environment.FILE_PATH_SEPARATOR);
        let driveFileName = filePath.slice(lastPos + 1);

        let response = await drive.files.create({
            requestBody: {
                name: driveFileName,
                mimeType: 'application/sql'
            },
            media: {
                mimeType: 'application/sql',
                body: fs.createReadStream(filePath)
            }
        });

        successCallback();
    } catch (err) {
        errCallback(err);
    }
}

async function updateFile(srcFilePath: string, targetFileId: string, successCallback, errCallback) {
    try {
        let response = await drive.files.update({
            fileId: targetFileId,
            requestBody: {
                mimeType: 'application/sql'
            },
            media: {
                mimeType: 'application/sql',
                body: fs.createReadStream(srcFilePath)
            }
        });

        successCallback();
    } catch (err) {
        errCallback(err);
    }
}

export {
    listFiles,
    downloadTourSchedule,
    downloadDrivingLog,
    uploadFile,
    updateFile
}