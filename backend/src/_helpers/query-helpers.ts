import { Secrets } from "../../config/secrets";
import { normalLog, timeStampLog } from "./logger";

declare var require: any;
let mysql = require('mysql');

const pool = mysql.createPool({
    host: Secrets.MY_SQL.HOST,
    user: Secrets.MY_SQL.USER,
    password: Secrets.MY_SQL.PASSWORD,
    database: Secrets.MY_SQL.DATABASE
});

pool.getConnection((err, conn) => {
    if (err) {
        normalLog('error connecting to the DB: ' + err.stack);
        return;
    }

    timeStampLog('Successfully connected to the DB!');
    conn.release();
});

// Core functions - no 'res' objects
function executeQuery(queryString: string, queryValues: any, callback, errCallback): void {
    pool.query(queryString, queryValues, (err, rows, fields) => {
        if (err) {
            errCallback(err);
            return;
        }

        callback(rows);
    });
}

function executeQueryInTransaction(conn: any, queryString: string, queryValues: any, callback, errCallback): void {
    conn.query(queryString, queryValues, (err, rows, fields) => {
        if (err) {
            errCallback(conn, err);
            return;
        }

        callback(conn, rows);
    });
}

function beginTransaction(callback, errCallback) {
    pool.getConnection((err, conn) => {
        if (err) {
            errCallback(err);
            return;
        }

        conn.beginTransaction(err => {
            if (err) {
                conn.release();
                errCallback(err);
                return;
            }
            
            callback(conn);
        });
    });
}

function rollbackTransaction(conn, err, errCallback) {
    conn.rollback(() => {
        conn.release();
        errCallback(err);
    });
}

function commitTransaction(conn, callback, errCallback) {
    conn.commit(err => {
        if (err) {
            rollbackTransaction(conn, err, errCallback);
            return;
        }

        conn.release();
        callback();
    });
}

// Packaged functions
function executeMultipleQueries(conn: any, queryStrings: string[], queryValues: any[], callback, errCallback): void {
    // Check if both arrays are of equal length
    if (queryStrings.length != queryValues.length) {
        errCallback('ERR: executeQueries function called with different length arrays!');
        return;
    }

    if (queryStrings.length == 0) {
        // Job is done - all queries were executed
        callback(conn);
        return;
    }

    executeQueryInTransaction(conn, queryStrings[0], queryValues[0], (conn, rows) => {
        executeMultipleQueries(conn, queryStrings.slice(1), queryValues.slice(1), callback, errCallback);
    }, errCallback);
}

function executeTransaction(queryStrings: string[], queryValues: any[], callback, errCallback): void {
    beginTransaction((conn) => {
        executeMultipleQueries(conn, queryStrings, queryValues, conn => {
            commitTransaction(conn, callback, errCallback);
        }, (conn, err) => rollbackTransaction(conn, err, errCallback));
    }, errCallback);
}

export {
    executeQuery,
    executeQueryInTransaction,
    beginTransaction,
    rollbackTransaction,
    commitTransaction,
    executeMultipleQueries,
    executeTransaction
};