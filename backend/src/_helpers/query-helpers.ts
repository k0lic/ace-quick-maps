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

function executeQueryWithoutResults(query_string: string, res): void {
    executeQueryWithCallback(query_string, res, rows => {
        res.sendStatus(200);
    }, null);
}

function executeQuery(query_string: string, res): void {
    executeQueryWithCallback(query_string, res, rows => {
        res.status(200).send(rows);
    }, null);
}

function executeQueryWithCallback(query_string: string, res, callback, err_callback): void {
    connection.query(query_string, (err, rows, fields) => {
        if (err) {
            if (err_callback != null) {
                err_callback(err);
            } else {
                console.log(err);
                res.sendStatus(500);
            }
            return;
        }

        callback(rows);
    });
}

// Execute queries one by one inside a transaction
function executeTransaction(queries: string[], res): void {
    beginTransaction(res, () => {
        executeQueries(queries, res, () => {
            commitTransaction(res, () => {
                res.sendStatus(200);
            });
        }, err => rollbackTransaction(res, err));
    }, null);
}

function beginTransaction(res, callback, err_callback) {
    connection.beginTransaction(err => {
        if (err) {
            if (err_callback != null) {
                err_callback(err);
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

// Execute queries one by one, calling this function recursively
function executeQueries(queries: string[], res, callback, err_callback): void {
    if (queries.length == 0) {
        // Job is done - all queries were executed
        callback();
        return;
    }

    executeQueryWithCallback(queries[0], res, rows => {
        executeQueries(queries.slice(1), res, callback, err_callback);
    }, err_callback);
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