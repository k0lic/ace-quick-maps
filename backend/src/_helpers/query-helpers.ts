declare var require: any;
let mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'quick_maps_schema'
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
    connection.query(queryString, queryValues, (err, rows, fields) => {
        if (err) {
            if (errCallback != null) {
                errCallback(err);
            } else {
                console.log(err);
                res.sendStatus(500);
            }
            return;
        }

        callback(rows);
    });
}

function executeTransaction(queryStrings: string[], queryValues: any[], res): void {
    beginTransaction(res, () => {
        executeQueries(queryStrings, queryValues, res, () => {
            commitTransaction(res, () => {
                res.sendStatus(200);
            });
        }, err => rollbackTransaction(res, err));
    }, null);
}

function beginTransaction(res, callback, errCallback) {
    connection.beginTransaction(err => {
        if (err) {
            if (errCallback != null) {
                errCallback(err);
            } else {
                console.log(err);
                res.sendStatus(500);
            }
            return;
        }
        
        callback();
    });
}

function rollbackTransaction(res, err) {
    return connection.rollback(() => {
        console.log(err);
        res.sendStatus(500);
    });
}

function commitTransaction(res, callback) {
    connection.commit(err => {
        if (err) {
            rollbackTransaction(res, err);
        }

        callback();
    });
}

function executeQueries(queryStrings: string[], queryValues: any[], res, callback, errCallback): void {
    // Check if both arrays are of equal length
    if (queryStrings.length != queryValues.length) {
        errCallback();
    }

    if (queryStrings.length == 0) {
        // Job is done - all queries were executed
        callback();
        return;
    }

    executeQueryWithCallback(queryStrings[0], queryValues[0], res, rows => {
        executeQueries(queryStrings.slice(1), queryValues.slice(1), res, callback, errCallback);
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
    executeQueries
};