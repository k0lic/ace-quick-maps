import { Secrets } from "../../config/secrets";

declare var require: any;
let mysql = require('mysql');

const connection = mysql.createConnection({
    host: Secrets.MY_SQL.HOST,
    user: Secrets.MY_SQL.USER,
    password: Secrets.MY_SQL.PASSWORD,
    database: Secrets.MY_SQL.DATABASE
});

connection.connect((err) => {
    if (err) {
        console.error('error connecting to the DB: ' + err.stack);
        return;
    }

    console.log('Successfully connected to the DB!');
});

function executeQueryWithoutResults(queryString: string, queryValues: any, res): void {
    executeQueryWithCallback(queryString, queryValues, res, rows => {
        res.sendStatus(200);
    }, null);
}

function executeQuery(queryString: string, queryValues: any, res): void {
    executeQueryWithCallback(queryString, queryValues, res, rows => {
        res.status(200).send(rows);
    }, null);
}

function executeQueryWithCallback(queryString: string, queryValues: any, res, callback, errCallback): void {
    // connection.query(queryString, queryValues, (err, rows, fields) => {
    //     if (err) {
    //         if (errCallback != null) {
    //             errCallback(err);
    //         } else {
    //             console.log(err);
    //             res.sendStatus(500);
    //         }
    //         return;
    //     }

    //     callback(rows);
    // });
    let realErrCallback = errCallback == null ? (err => {
        console.log(err);
        res.sendStatus(500);
    }) : errCallback;
    coreExecuteQueryWithCallback(queryString, queryValues, callback, realErrCallback);
}

function executeTransaction(queryStrings: string[], queryValues: any[], res): void {
    // beginTransaction(res, () => {
    //     executeQueries(queryStrings, queryValues, res, () => {
    //         commitTransaction(res, () => {
    //             res.sendStatus(200);
    //         });
    //     }, err => rollbackTransaction(res, err));
    // }, null);
    coreExecuteTransaction(queryStrings, queryValues, () => {
        res.sendStatus(200);
    }, err => {
        console.log(err);
        res.sendStatus(500);
    })
}

function beginTransaction(res, callback, errCallback) {
    // connection.beginTransaction(err => {
    //     if (err) {
    //         if (errCallback != null) {
    //             errCallback(err);
    //         } else {
    //             console.log(err);
    //             res.sendStatus(500);
    //         }
    //         return;
    //     }
        
    //     callback();
    // });
    let realErrCallback = errCallback == null ? (err => {
        console.log(err);
        res.sendStatus(500);
    }) : errCallback;
    coreBeginTransaction(callback, realErrCallback);
}

function rollbackTransaction(res, err) {
    // return connection.rollback(() => {
    //     console.log(err);
    //     res.sendStatus(500);
    // });
    coreRollbackTransaction(err, err => {
        console.log(err);
        res.sendStatus(500);
    });
}

function commitTransaction(res, callback) {
    // connection.commit(err => {
    //     if (err) {
    //         rollbackTransaction(res, err);
    //     }

    //     callback();
    // });
    coreCommitTransaction(callback, err => {
        console.log(err);
        res.sendStatus(500);
    });
}

function executeQueries(queryStrings: string[], queryValues: any[], res, callback, errCallback): void {
    // // Check if both arrays are of equal length
    // if (queryStrings.length != queryValues.length) {
    //     errCallback('ERR: executeQueries function called with different length arrays!');
    //     return;
    // }

    // if (queryStrings.length == 0) {
    //     // Job is done - all queries were executed
    //     callback();
    //     return;
    // }

    // executeQueryWithCallback(queryStrings[0], queryValues[0], res, rows => {
    //     executeQueries(queryStrings.slice(1), queryValues.slice(1), res, callback, errCallback);
    // }, errCallback);
    let realErrCallback = errCallback == null ? (err => {
        console.log(err);
        res.sendStatus(500);
    }) : errCallback;
    coreExecuteQueries(queryStrings, queryValues, callback, realErrCallback);
}

// Core functions - no 'res' objects
function coreExecuteQueryWithCallback(queryString: string, queryValues: any, callback, errCallback): void {
    connection.query(queryString, queryValues, (err, rows, fields) => {
        if (err) {
            errCallback(err);
            return;
        }

        callback(rows);
    });
}

function coreBeginTransaction(callback, errCallback) {
    connection.beginTransaction(err => {
        if (err) {
            errCallback(err);
            return;
        }
        
        callback();
    });
}

function coreRollbackTransaction(err, errCallback) {
    return connection.rollback(() => errCallback(err));
}

function coreCommitTransaction(callback, errCallback) {
    connection.commit(err => {
        if (err) {
            coreRollbackTransaction(err, errCallback);
        }

        callback();
    });
}

function coreExecuteQueries(queryStrings: string[], queryValues: any[], callback, errCallback): void {
    // Check if both arrays are of equal length
    if (queryStrings.length != queryValues.length) {
        errCallback('ERR: executeQueries function called with different length arrays!');
        return;
    }

    if (queryStrings.length == 0) {
        // Job is done - all queries were executed
        callback();
        return;
    }

    coreExecuteQueryWithCallback(queryStrings[0], queryValues[0], rows => {
        coreExecuteQueries(queryStrings.slice(1), queryValues.slice(1), callback, errCallback);
    }, errCallback);
}

function coreExecuteTransaction(queryStrings: string[], queryValues: any[], callback, errCallback): void {
    coreBeginTransaction(() => {
        coreExecuteQueries(queryStrings, queryValues, () => {
            coreCommitTransaction(callback, errCallback);
        }, err => coreRollbackTransaction(err, errCallback));
    }, errCallback);
}

export {
    executeQueryWithoutResults,
    executeQuery,
    executeQueryWithCallback,
    executeTransaction,
    beginTransaction,
    rollbackTransaction,
    commitTransaction,
    executeQueries,
    coreExecuteQueryWithCallback,
    coreBeginTransaction,
    coreRollbackTransaction,
    coreCommitTransaction,
    coreExecuteQueries,
    coreExecuteTransaction
};