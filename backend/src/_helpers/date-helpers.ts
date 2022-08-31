function getYYYYMMDDdashed(date: Date): string {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}

function getDDMMYYYYslashed(date: Date): string {
    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
}

function getFebruaryNextYear(): Date {
    let date = new Date();  // get today's date
    date.setFullYear(date.getFullYear() + 1);   // add one year
    date.setMonth(1);   // February - months are indexed from 0
    date.setDate(1);    // The 1st

    return date;
}

export {
    getYYYYMMDDdashed,
    getDDMMYYYYslashed,
    getFebruaryNextYear
}