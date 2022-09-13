import { getTimestampForLog } from "./date-helpers";

function normalLog(msg: any): void {
    console.log(msg);
}

function timeStampLog(msg: any): void {
    normalLog('[ ' + getTimestampForLog() + ' ] ' + msg);
}

export {
    normalLog,
    timeStampLog
}