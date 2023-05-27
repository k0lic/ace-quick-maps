import { Environment } from "../../config/environment";
import { Secrets } from "../../config/secrets";
import { executeQuery } from "./query-helpers";

function getYear(callback, errCallback): void {
    let queryString = 'SELECT y.value FROM years y, current_year cy WHERE y.id = cy.current';
    executeQuery(queryString, [], rows => {
        callback(Number(rows[0].value));
    }, errCallback);
}

function getTourScheduleLocalPath(year): string {
    return Environment.FILE_PATHS.TOUR_SCHEDULE[year];
}

function getDrivingLogLocalPath(year): string {
    return Environment.FILE_PATHS.DRIVING_LOG[year];
}

function getTourScheduleDriveFileId(year): string {
    return Secrets.DRIVE_FILE_IDS.TOUR_SCHEDULE[year];
}

function getDrivingLogDriveFileId(year): string {
    return Secrets.DRIVE_FILE_IDS.DRIVING_LOG[year];
}

export {
    getYear,
    getTourScheduleLocalPath,
    getDrivingLogLocalPath,
    getTourScheduleDriveFileId,
    getDrivingLogDriveFileId
}