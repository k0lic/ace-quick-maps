import { Console } from "console";

declare var require: any;
let stringHelpers = require('./string-helpers');

class DatasetErrorReport {
    private info: string[];
    private errors: string[];
    private warnings: string[];

    constructor() {
        this.info = [];
        this.errors = [];
        this.warnings = [];
    }

    addInfo(info: string): void {
        this.info.push(info);
    }

    addError(err: string): void {
        this.errors.push(err);
    }

    addWarning(warn: string): void {
        this.warnings.push(warn);
    }

    hasErrors(): boolean {
        return this.errors.length > 0;
    }

    printAll(): void {
        console.log('DATASET ERROR REPORT START');
        this.info.forEach(info => console.log(info));
        console.log('');
        console.log('Errors found: ' + this.errors.length);
        this.errors.forEach(err => console.log(err));
        console.log('Warnings found: ' + this.warnings.length);
        this.warnings.forEach(warn => console.log(warn));
        console.log('DATASET ERROR REPORT END');
    }

    renderHtml(resourceName: string): string {
        let html = '';

        // TODO: Offer email language customisation? The report messages should also be included
        // html += '<p>Server encountered errors in \'' + resourceName + '\'<p>'
        // html += '<br/><br/>';
        // html += '<p>Errors found: <b style="color:red">' + report.errors.length + '<\b></p>';
        // html += '<ul>';
        // report.errors.forEach(err => {  
        //     html += '<li>' + stringHelpers.escapeHtml(err) + '</li>';
        // });
        // html += '</ul>';
        // html += '<br/><br/>';
        // html += '<p>';
        // html += '   You are receiving this email because you are listed as the owner of the resource \'' + resourceName + '\'.';
        // html += '   Try to contact someone from the staff if this is not correct.'
        // html += '</p>'
        // html += '<br/><br/>';
    
        html += '<p>Server je naišao na greške prilikom obrade \'' + resourceName + '\' resursa.<p>'
        html += '<br/><br/>';
        html += '<p>Broj grešaka: <b style="color:red">' + this.errors.length + '</b></p>';
        html += '<ul>';
        this.errors.forEach(err => {  
            html += '<li>' + stringHelpers.escapeHtml(err) + '</li>';
        });
        html += '</ul>';
        html += '<br/><br/>';
        html += '<p>';
        html += '   Ovaj mejl Vam je poslat zato što ste vi navedeni kao osoba odgovorna za \'' + resourceName + '\'.';
        html += '   Pokušajte da kontaktirate nekog od zaposlenih ako ovo nije tačno.'
        html += '</p>'
        html += '<br/><br/>';
    
        return html;
    }
}

function atRowMessage(prefix, rowNumber, suffix) {
    // return (prefix ?? '') + ' at row ' + rowNumber + (suffix ?? '');
    return (prefix ?? '') + ' u ' + rowNumber + '. redu' + (suffix ?? '');
}

function unexpectedValueMsg(columnName, foundValue, rowNumber, suffix): string {
    // return atRowMessage('Unexpected value for \'' + columnName + '\' <' + foundValue + '>', rowNumber, suffix);
    return atRowMessage('Neočekivana vrednost za \'' + columnName + '\' <' + foundValue + '>', rowNumber, suffix);
}

function missingValueMsg(columnName, rowNumber, suffix): string {
    // return atRowMessage('Missing value for \'' + columnName + '\'', rowNumber, suffix);
    return atRowMessage('Vrednost nedostaje za \'' + columnName + '\'', rowNumber, suffix);
}

export {
    DatasetErrorReport,
    atRowMessage,
    unexpectedValueMsg,
    missingValueMsg
}