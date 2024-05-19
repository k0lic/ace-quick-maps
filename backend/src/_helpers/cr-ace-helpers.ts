import { Secrets } from "../../config/secrets";
import { DatasetErrorReport, unexpectedValueMsg } from "./dataset-error-report";
import { getYear, getDrivingLogLocalPath } from "./version-helper";
import axios from "axios";

const fs = require("fs");
const instance = axios.create({
    baseURL: Secrets.CR_ACE.API_BASE_URL
});
instance.defaults.headers.common["Authorization"] = `Bearer ${Secrets.CR_ACE.TOKEN}`;

function getTourDayAssignments(conn: any, report: DatasetErrorReport, successCallback, errCallback) {
    instance.get("/tour-day-assignments"
    ).then(response => {
        getYear(year => {
            fs.writeFileSync(getDrivingLogLocalPath(year), JSON.stringify(response.data));
            successCallback(conn, report);
        }, err => errCallback(conn, err));
    }).catch(err => {
        errCallback(conn, err);
    });
}

function processTourDayAssignmentsResponse(report: DatasetErrorReport, callback, errCallback) {
    getYear(year => {
        try {
            // Read driving log file
            let rawdata = fs.readFileSync(getDrivingLogLocalPath(year));
            let drivingLog = JSON.parse(rawdata);

            // Setup
            let tourCodePattern = /^([^-]*)-([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/;
            let rows = [];

            // Adapt to expected format
            drivingLog.forEach((r, index) => {
                let tourCodeMatch = r.tour_code.match(tourCodePattern);
                if (tourCodeMatch == null) {
                    // Serious error - Include it in the report
                    report.addError(unexpectedValueMsg('TourCode', r.tour_code, index, null))
                    return;
                }

                let adapted = {
                    rowNumber: index,
                    date: r.date,
                    tourCode: r.tour_code,
                    tourName: tourCodeMatch[1],
                    startDate: new Date(Number(tourCodeMatch[4]), Number(tourCodeMatch[3]) - 1, Number(tourCodeMatch[2])),
                    dayNumber: r.itinerary_day_number,
                    destination: "",
                    vehicle1: null,
                    driver1: r.driver_1,
                    vehicle2: null,
                    driver2: r.driver_2,
                    vehicle3: null,
                    driver3: r.driver_3,
                    carrier1: r.carrier_1,
                    type1: null,
                    carrier2: r.carrier_2,
                    type2: null,
                    carrier3: r.carrier_3,
                    type3: null,
                    notice: null
                };
                rows.push(adapted);
            });

            // Finish
            callback(rows);
        } catch (err) {
            errCallback(err);
        }
    }, errCallback);
}

export {
    getTourDayAssignments,
    processTourDayAssignmentsResponse
}