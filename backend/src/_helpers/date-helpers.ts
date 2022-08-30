function getYYYYMMDDdashed(date: Date): string {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}

function getDDMMYYYYslashed(date: Date): string {
    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
}

export {
    getYYYYMMDDdashed,
    getDDMMYYYYslashed
}