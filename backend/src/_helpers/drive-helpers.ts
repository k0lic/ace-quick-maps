import { Environment } from "../../config/environment";
import { Secrets } from "../../config/secrets";
import { DatasetErrorReport } from "./dataset-error-report";

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
        console.log(err);
        res.sendStatus(500);
    }
}

function downloadFromDrive(fileId, fileDestPath, successCallback, errCallback) {
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

function downloadTourSchedule(report: DatasetErrorReport, successCallback, errCallback) {
    downloadFromDrive(Secrets.DRIVE_FILE_IDS.TOUR_SCHEDULE, Environment.FILE_PATHS.TOUR_SCHEDULE, () => successCallback(report), errCallback);
}

function downloadDrivingLog(report: DatasetErrorReport, successCallback, errCallback) {
    downloadFromDrive(Secrets.DRIVE_FILE_IDS.DRIVING_LOG, Environment.FILE_PATHS.DRIVING_LOG, () => successCallback(report), errCallback);
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

export {
    listFiles,
    downloadTourSchedule,
    downloadDrivingLog,
    uploadFile
}