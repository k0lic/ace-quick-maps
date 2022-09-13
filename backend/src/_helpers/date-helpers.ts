function getYYYYMMDDdashed(date: Date): string {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}

function getDDMMYYYYslashed(date: Date): string {
    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
}

function getDDMMYYslashed(date: Date): string {
    return padZerosToTwo(date.getDate()) 
        + '/' + padZerosToTwo(date.getMonth() + 1) 
        + '/' + padZerosToTwo(Number(date.getFullYear().toString().slice(-2)));
}

function padZerosToTwo(x: number) {
    return (x < 10 ? '0' : '') + x;
}

function getFebruaryNextYear(): Date {
    let date = new Date();  // get today's date
    date.setFullYear(date.getFullYear() + 1);   // add one year
    date.setMonth(1);   // February - months are indexed from 0
    date.setDate(1);    // The 1st

    return date;
}

function getTimestampForLog(): string {
    let now = new Date();
    return getDDMMYYYYslashed(now) + ' ' + padZerosToTwo(now.getHours()) + ':' + padZerosToTwo(now.getMinutes()) + ':' + padZerosToTwo(now.getSeconds());
}

export {
    getYYYYMMDDdashed,
    getDDMMYYYYslashed,
    getDDMMYYslashed,
    getFebruaryNextYear,
    getTimestampForLog
}