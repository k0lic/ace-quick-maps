import { Constants } from "../constants";
import { respondWith500, respondWithJust200 } from "../_helpers/http-responses";
import { normalLog } from "../_helpers/logger";
import { beginTransaction, commitTransaction, executeQuery, executeQueryInTransaction, rollbackTransaction } from "../_helpers/query-helpers";

declare var require: any;
let express = require('express');
let bcrypt = require('bcrypt');
let crypto = require('crypto');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let jwtHelpers = require('../_helpers/jwt-helpers');
let dateHelpers = require('../_helpers/date-helpers');
let mailHelpers = require('../_helpers/mail-helpers');

// Make sure only guests have access - a logged in user should not be able to eg. log in
router.use(userCheckers.assertNoUser);

// List routes here
router.post('/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    let today = new Date();
    let todayString = dateHelpers.getYYYYMMDDdashed(today);

    // Check if user exists - approved and has not had access revoked
    let queryString = 'SELECT * FROM users WHERE email = ? AND approved = 1 AND revoke_access_date > ?';
    let queryValues = [email, todayString];
    executeQuery(queryString, queryValues, rows => {
        if (rows.length == 0) {
            res.sendStatus(500);
            return;
        }

        // Check password with hash in DB
        bcrypt.compare(password, rows[0].password, (err, cmp) => {
            if (err) {
                normalLog(err);
                res.sendStatus(500);
                return;
            }

            // Wrong password
            if (!cmp) {
                res.sendStatus(500);
                return;
            }

            // Correct password
            // Add jwt Refresh Token to DB and cookies
            jwtHelpers.createNewRefreshToken(email, res, () => {
                // Add jwt Access Token to cookies
                let token = jwtHelpers.createAccessToken(rows[0]);
                jwtHelpers.setAccessToken(token, res);

                // Add User Type to cookies - used on the frontend for page access restriction (QoL)
                jwtHelpers.setUserTypeCookie(res, rows[0].user_type);
    
                res.sendStatus(200);
            }, err => {
                normalLog(err);
                res.sendStatus(500);
            });
        });
    }, err => respondWith500(res, err));
});

router.post('/register', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let name = req.body.name;
    let lastName = req.body.last;

    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            normalLog(err);
            res.sendStatus(500);
            return;
        }

        // Next year, 1st of February - good time for access to be reset I think - outside of the season, not during the new year's holidays
        let radString = dateHelpers.getYYYYMMDDdashed(dateHelpers.getFebruaryNextYear());

        let queryString = 'INSERT INTO users (email, user_type, name, last_name, approved, password, revoke_access_date) VALUES ?';
        let queryValues = [[[email, 'viewer', name, lastName, 0, hash, radString]]];
        
        executeQuery(queryString, queryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
    });
});

router.post('/forgot', (req, res) => {
    let email = req.body.email;

    let today = new Date();
    let todayString = dateHelpers.getYYYYMMDDdashed(today);

    // Check if user exists - approved and has not had access revoked
    let queryString = 'SELECT * FROM users WHERE email = ? AND approved = 1 AND revoke_access_date > ?';
    let queryValues = [email, todayString];
    executeQuery(queryString, queryValues, rows => {
        if (rows.length == 0) {
            res.sendStatus(500);
            return;
        }

        // Create random reset string
        crypto.randomBytes(Constants.PASSWORD_RESET.CODE_LENGTH, (err, buf) => {
            if (err) {
                normalLog(err);
                res.sendStatus(500);
                return;
            }

            let resetCode = buf.toString('hex');
            let expires = new Date(new Date().getTime() + 5 * 60 * 1000);   // expires in 5 minutes

            // Check if there's already a reset key for this user - don't care if it's expired, we're replacing it anyway
            let checkQueryString: string = 'SELECT * FROM password_reset_codes WHERE email = ?';
            let checkQueryValues: any[] = [email];

            // Wrap insert/update in a transaction, so it can be aborted if sending the email fails, since there's no point in creating a reset link that can't be accessed by the user
            beginTransaction(conn => {
                executeQueryInTransaction(conn, checkQueryString, checkQueryValues, (conn, rows) => {
                    let insertUpdateQueryString: string = '';
                    let insertUpdateQueryValues: any[] = [];
    
                    if (rows.length == 0) {
                        // No key currently exists for user
                        insertUpdateQueryString = 'INSERT INTO password_reset_codes (code, email, expires) VALUES ?';
                        insertUpdateQueryValues = [[[resetCode, email, expires]]];
                    } else {
                        // There's already a key for this user
                        insertUpdateQueryString = 'UPDATE password_reset_codes SET code = ?, expires = ? WHERE email = ?';
                        insertUpdateQueryValues = [resetCode, expires, email];
                    }
    
                    executeQueryInTransaction(conn, insertUpdateQueryString, insertUpdateQueryValues, (conn, result) => {
                        // Code successfully created, inform user by sending an email
                        mailHelpers.sendMail(
                            email, 
                            Constants.MAIL_TEMPLATES.RESET.SUBJECT, 
                            Constants.MAIL_TEMPLATES.RESET.TEXT.replace('<reset-code>', resetCode), 
                            info => {
                                // User successfully notified, commit transaction
                                // Might happen that commit fails, and user is left with void link in email, but that poses no security risks so is better than the alternative
                                // The alternative would be to only send the email after everything is done on the DB, and then the email could fail, leaving an active link that is not reachable by the user - not a real risk since the link is secure and time restricted, but why create an unusable link anyway
                                commitTransaction(conn, () => respondWithJust200(res), err => respondWith500(res, err));
                            }, err => rollbackTransaction(conn, err, err => respondWith500(res, err))
                        );
                    }, (conn, err) => rollbackTransaction(conn, err, err => respondWith500(res, err)));
                }, (conn, err) => rollbackTransaction(conn, err, err => respondWith500(res, err)));
            }, null);
        });
    }, err => respondWith500(res, err));
});

router.post('/reset_code_check', (req, res) => {
    let code = req.body.code;

    let queryString = 'SELECT * FROM password_reset_codes WHERE code = ? AND expires > ?';
    let queryValues = [code, new Date()];

    executeQuery(queryString, queryValues, rows => {
        if (rows.length == 0) {
            // Code is non-existant/wrong/expired
            res.sendStatus(401);
            return;
        }

        // Code is valid
        respondWithJust200(res);
    }, err => respondWith500(res, err));
});

router.post('/reset_password', (req, res) => {
    let code = req.body.code;
    let password = req.body.password;

    // Fetch email linked to the reset code
    let fetchEmailQueryString = 'SELECT * FROM password_reset_codes WHERE code = ? AND expires > ?';
    let fetchEmailQueryValues = [code, new Date()];

    executeQuery(fetchEmailQueryString, fetchEmailQueryValues, rows => {
        if (rows.length == 0) {
            // Code is non-existant/wrong/expired
            res.sendStatus(401);
            return;
        }

        // Since valid reset code exist, we can reasonably assume that the user is activated/with access rights, and even if he isn't changing a password won't allow them to log back into an expired account
        let email = rows[0].email;

        // Hash password
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                respondWith500(res, err);
                return;
            }

            // Update password
            let updateQueryString = 'UPDATE users SET password = ? WHERE email = ?';
            let updateQueryValues = [hash, email];
            
            executeQuery(updateQueryString, updateQueryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
        });
    }, err => respondWith500(res, err));
});

router.get('/clear_cookies', (req, res) => {
    // Same as the logout route in login-routes - just does not require you to be logged in
    // Delete Refresh Token, Access Token and User Type (used for frontend page access control) cookies
    jwtHelpers.deleteRefreshTokenIfExists(req, res, () => {
        jwtHelpers.clearAccessToken(res);
        jwtHelpers.clearUserTypeCookie(res);
        res.sendStatus(200);
    }, err => {
        normalLog(err);
        res.sendStatus(500);
    });
});

// Export router
export {
    router
}
