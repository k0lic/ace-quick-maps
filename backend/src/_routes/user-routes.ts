import { Constants } from "../constants";
import { respondWith200, respondWith500, respondWithJust200 } from "../_helpers/http-responses";
import { executeQuery } from "../_helpers/query-helpers";

declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let mailHelpers = require('../_helpers/mail-helpers');
let jwtHelpers = require('../_helpers/jwt-helpers');
let dateHelpers = require('../_helpers/date-helpers');

// Make sure only managers and higher roles have access
router.use(userCheckers.assertIsManagerOrHigher);

// List routes here
router.get('/active_users', (req, res) => {
    let queryString = 'SELECT email, name, last_name, user_type FROM users WHERE approved = 1 AND revoke_access_date > ?';
    let today = new Date();
    let todayString = dateHelpers.getYYYYMMDDdashed(today);
    let queryValues = [todayString];

    executeQuery(queryString, queryValues, rows => respondWith200(res, rows), err => respondWith500(res, err));
});

router.get('/expired_users', (req, res) => {
    let queryString = 'SELECT email, name, last_name, user_type FROM users WHERE approved = 1 AND revoke_access_date <= ?';
    let today = new Date();
    let todayString = dateHelpers.getYYYYMMDDdashed(today);
    let queryValues = [todayString];

    executeQuery(queryString, queryValues, rows => respondWith200(res, rows), err => respondWith500(res, err));
});

router.get('/user_requests', (req, res) => {
    let queryString = 'SELECT email, name, last_name, user_type FROM users WHERE approved = 0';
    executeQuery(queryString, [], rows => respondWith200(res, rows), err => respondWith500(res, err));
});

router.get('/types', (req, res) => {
    let queryString = 'SELECT * FROM user_types';
    executeQuery(queryString, [], rows => respondWith200(res, rows), err => respondWith500(res, err));
});

router.post('/approve_user', (req, res) => {
    let user = req.body.user;
    let type = req.body.type;

    // Fetch request - allowed to approve only non-approved users
    let fetchQueryString = 'SELECT * FROM users WHERE email = ? AND approved = 0';
    let fetchQueryValues = [user];

    executeQuery(fetchQueryString, fetchQueryValues, rows => {
        if (rows.length == 0) {
            res.sendStatus(500);
            return;
        }

        // Check if user is allowed to approve user of type
        let content = jwtHelpers.extractAccessTokenContent(req, res);
        let loggedType = content?.type;
        if (loggedType == null || !isHigherOrEqual(loggedType, type)) {
            // Logged user is not allowed to approve new user of type
            res.sendStatus(403);
            return;
        }

        let queryString = 'UPDATE users SET approved = 1, revoke_access_date = ?, user_type = ? WHERE email = ?';
        let queryValues = [dateHelpers.getYYYYMMDDdashed(dateHelpers.getFebruaryNextYear()), type, user];

        executeQuery(queryString, queryValues, result => {
            // User successfully approved, send a greeting mail to them
            mailHelpers.sendMailConsoleLog(
                user,
                Constants.MAIL_TEMPLATES.WELCOME.SUBJECT,
                Constants.MAIL_TEMPLATES.WELCOME.TEXT
            );

            // Send success status regardless of the mailing result
            respondWithJust200(res);
        }, err => respondWith500(res, err));
    }, err => respondWith500(res, err));
});

router.post('/delete_request', (req, res) => {
    let user = req.body.user;

    // Allowed to delete only non-approved users
    let queryString = 'DELETE FROM users WHERE email = ? AND approved = 0';
    let queryValues = [user];

    executeQuery(queryString, queryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
});

router.post('/change_user_type', (req, res) => {
    let user = req.body.user;
    let type = req.body.type;

    // Fetch user's account type - allowed to change type of expired users
    let fetchQueryString = 'SELECT * FROM users WHERE email = ? AND approved = 1';
    let fetchQueryValues = [user];

    executeQuery(fetchQueryString, fetchQueryValues, rows => {
        if (rows.length == 0) {
            res.sendStatus(500);
            return;
        }

        let oldType = rows[0].user_type;

        // Check if user is allowed to perform the requested type change
        let content = jwtHelpers.extractAccessTokenContent(req, res);
        let loggedType = content?.type;
        if (loggedType == null || !isHigher(loggedType, oldType)) {
            // Logged user is not allowed to change user type from oldType
            res.sendStatus(403);
            return;
        }
        if (!isHigherOrEqual(loggedType, type)) {
            // Logged user is not allowed to change user type to type
            res.sendStatus(403);
            return;
        }

        // Revoke access to user by setting revoke access date to far in the past
        let changeTypeQueryString = 'UPDATE users SET user_type = ? WHERE email = ?';
        let changeTypeQueryValues = [type, user];

        executeQuery(changeTypeQueryString, changeTypeQueryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
    }, err => respondWith500(res, err));
});

router.post('/revoke_access', (req, res) => {
    let user = req.body.user;

    // Fetch user's account type
    let fetchQueryString = 'SELECT * FROM users WHERE email = ? AND approved = 1 AND revoke_access_date > ?';
    let today = new Date();
    let todayString = dateHelpers.getYYYYMMDDdashed(today);
    let fetchQueryValues = [user, todayString];

    executeQuery(fetchQueryString, fetchQueryValues, rows => {
        if (rows.length == 0) {
            res.sendStatus(500);
            return;
        }

        let type = rows[0].user_type;

        // Check if user is allowed to approve user of type
        let content = jwtHelpers.extractAccessTokenContent(req, res);
        let loggedType = content?.type;
        if (loggedType == null || !isHigher(loggedType, type)) {
            // Logged user is not allowed to revoke access to user of type
            res.sendStatus(403);
            return;
        }

        // Revoke access to user by setting revoke access date to far in the past
        let revokeQueryString = 'UPDATE users SET revoke_access_date = ? WHERE email = ?';
        let revokeQueryValues = ['1970-01-01', user];

        executeQuery(revokeQueryString, revokeQueryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
    }, err => respondWith500(res, err));
});

router.post('/renew_access', (req, res) => {
    let user = req.body.user;

    // Fetch user's account - only allowed to renew access to user's whose access has expired
    let fetchQueryString = 'SELECT * FROM users WHERE email = ? AND approved = 1 AND revoke_access_date <= ?';
    let today = new Date();
    let todayString = dateHelpers.getYYYYMMDDdashed(today);
    let fetchQueryValues = [user, todayString];

    executeQuery(fetchQueryString, fetchQueryValues, rows => {
        if (rows.length == 0) {
            res.sendStatus(500);
            return;
        }

        let type = rows[0].user_type;

        // Check if user is allowed to renew access to user of type
        let content = jwtHelpers.extractAccessTokenContent(req, res);
        let loggedType = content?.type;
        if (loggedType == null || !isHigherOrEqual(loggedType, type)) {
            // Logged user is not allowed to renew access to user of type
            res.sendStatus(403);
            return;
        }

        // Renew access to user
        let renewQueryString = 'UPDATE users SET revoke_access_date = ? WHERE email = ?';
        let renewQueryValues = [dateHelpers.getYYYYMMDDdashed(dateHelpers.getFebruaryNextYear()), user];

        executeQuery(renewQueryString, renewQueryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
    }, err => respondWith500(res, err));
});

// Quick and dirty user hierarchy solution
const userTypeValue = {
    'viewer': 1,
    'user_manager': 2,
    'admin': 3
};

function isValidUserType(type: string): boolean {
    return userTypeValue.hasOwnProperty(type);
}

function isHigher(user: string, other: string): boolean {
    return isValidUserType(user) && isValidUserType(other) && userTypeValue[user] > userTypeValue[other];
}

function isHigherOrEqual(user: string, other: string): boolean {
    return isValidUserType(user) && isValidUserType(other) && userTypeValue[user] >= userTypeValue[other];
}

// Export router
export {
    router
}