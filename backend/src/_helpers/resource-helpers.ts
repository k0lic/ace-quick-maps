import { getYear } from "./version-helper";
import { DatasetErrorReport } from "./dataset-error-report";

let crAceHelpers = require('../_helpers/cr-ace-helpers');
let driveHelpers = require('../_helpers/drive-helpers');
let excelHelpers = require('../_helpers/excel-helpers');

const drivingLogResourceFetchers = {
    2022: driveHelpers.downloadDrivingLog,
    2023: driveHelpers.downloadDrivingLog,
    2024: crAceHelpers.getTourDayAssignments,
};

async function getDrivingLogResource(conn: any, report: DatasetErrorReport, successCallback, errCallback) {
    getYear(year => drivingLogResourceFetchers[year](conn, report, successCallback, errCallback), errCallback);
}

const drivingLogResourceProcessors = {
    2022: excelHelpers.processDrivingLogExcelFileSelectVersion,
    2023: excelHelpers.processDrivingLogExcelFileSelectVersion,
    2024: crAceHelpers.processTourDayAssignmentsResponse,
};

async function processDrivingLogResource(report: DatasetErrorReport, successCallback, errCallback) {
    getYear(year => drivingLogResourceProcessors[year](report, successCallback, errCallback), errCallback);
}

export {
    getDrivingLogResource,
    processDrivingLogResource
}