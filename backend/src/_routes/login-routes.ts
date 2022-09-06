import { Secrets } from "../../config/secrets";
import { Constants } from "../constants";

declare var require: any;
let express = require('express');
let bcrypt = require('bcrypt');
let crypto = require('crypto');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let queryHelpers = require('../_helpers/query-helpers');
let stringHelpers = require('../_helpers/string-helpers');
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
    queryHelpers.executeQueryWithCallback(queryString, queryValues, res, rows => {
        if (rows.length == 0) {
            console.log('User not found');
            res.sendStatus(500);
            return;
        }

        // Check password with hash in DB
        bcrypt.compare(password, rows[0].password, (err, cmp) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }

            // Wrong password
            if (!cmp) {
                console.log('Wrong password');
                res.sendStatus(500);
                return;
            }

            // Correct password - add jwt to cookies
            let token = jwtHelpers.createJwt(rows[0]);
            res.cookie(Secrets.JWT.SESSION_ID, token);

            // Create another cookie that's used for 'dumb' page restriction by angular - not for security but for QOL
            res.cookie(Constants.USER_TYPE, rows[0].user_type);

            res.sendStatus(200);
        });
    }, null);
});

router.post('/register', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let name = req.body.name;
    let lastName = req.body.last;

    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        // Next year, 1st of February - good time for access to be reset I think - outside of the season, not during the new year's holidays
        let radString = dateHelpers.getYYYYMMDDdashed(dateHelpers.getFebruaryNextYear());

        let queryString = 'INSERT INTO users (email, user_type, name, last_name, approved, password, revoke_access_date) VALUES ?';
        let queryValues = [[[email, 'viewer', name, lastName, 0, hash, radString]]];
        
        queryHelpers.executeQueryWithoutResults(queryString, queryValues, res);
    });
});

router.post('/forgot', (req, res) => {
    let email = req.body.email;

    let today = new Date();
    let todayString = dateHelpers.getYYYYMMDDdashed(today);

    // Check if user exists - approved and has not had access revoked
    let queryString = 'SELECT * FROM users WHERE email = ? AND approved = 1 AND revoke_access_date > ?';
    let queryValues = [email, todayString];
    queryHelpers.executeQueryWithCallback(queryString, queryValues, res, rows => {
        if (rows.length == 0) {
            console.log('User not found');
            res.sendStatus(500);
            return;
        }

        // Create random reset string
        crypto.randomBytes(Constants.PASSWORD_RESET.CODE_LENGTH, (err, buf) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }

            let resetCode = buf.toString('hex');
            let expires = new Date(new Date().getTime() + 5 * 60 * 1000);   // expires in 5 minutes

            // Check if there's already a reset key for this user - don't care if it's expired, we're replacing it anyway
            let checkQueryString: string = 'SELECT * FROM password_reset_codes WHERE email = ?';
            let checkQueryValues: any[] = [email];

            // Wrap insert/update in a transaction, so it can be aborted if sending the email fails, since there's no point in creating a reset link that can't be accessed by the user
            queryHelpers.beginTransaction(res, () => {
                queryHelpers.executeQueryWithCallback(checkQueryString, checkQueryValues, res, rows => {
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
    
                    queryHelpers.executeQueryWithCallback(insertUpdateQueryString, insertUpdateQueryValues, res, result => {
                        // Code successfully created, inform user by sending an email
                        mailHelpers.sendMail(
                            email, 
                            Constants.MAIL_TEMPLATES.RESET.SUBJECT, 
                            Constants.MAIL_TEMPLATES.RESET.TEXT.replace('<reset-code>', resetCode), 
                            info => {
                                // User successfully notified, commit transaction
                                // Might happen that commit fails, and user is left with void link in email, but that poses no security risks so is better than the alternative
                                // The alternative would be to only send the email after everything is done on the DB, and then the email could fail, leaving an active link that is not reachable by the user - not a real risk since the link is secure and time restricted, but why create an unusable link anyway
                                queryHelpers.commitTransaction(res, () => {
                                    res.sendStatus(200);
                                });
                            }, err => queryHelpers.rollbackTransaction(res, err)
                        );
                    }, err => queryHelpers.rollbackTransaction(res, err));
                }, err => queryHelpers.rollbackTransaction(res, err));
            }, null);
        });
    }, null);
});

router.post('/reset_code_check', (req, res) => {
    let code = req.body.code;

    let queryString = 'SELECT * FROM password_reset_codes WHERE code = ? AND expires > ?';
    let queryValues = [code, new Date()];

    queryHelpers.executeQueryWithCallback(queryString, queryValues, res, rows => {
        if (rows.length == 0) {
            // Code is non-existant/wrong/expired
            res.sendStatus(401);
            return;
        }

        // Code is valid
        res.sendStatus(200);
    }, null);
});

router.post('/reset_password', (req, res) => {
    let code = req.body.code;
    let password = req.body.password;

    // Fetch email linked to the reset code
    let fetchEmailQueryString = 'SELECT * FROM password_reset_codes WHERE code = ? AND expires > ?';
    let fetchEmailQueryValues = [code, new Date()];

    queryHelpers.executeQueryWithCallback(fetchEmailQueryString, fetchEmailQueryValues, res, rows => {
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
                console.log(err);
                res.sendStatus(500);
                return;
            }

            // Update password
            let updateQueryString = 'UPDATE users SET password = ? WHERE email = ?';
            let updateQueryValues = [hash, email];
            
            queryHelpers.executeQueryWithoutResults(updateQueryString, updateQueryValues, res);
        });
    }, null);
});

router.get('/clear_cookies', (req, res) => {
    // Same as the logout route in login-routes - just does not require you to be logged in
    jwtHelpers.clearJwt(res);
    res.clearCookie(Constants.USER_TYPE);
    res.sendStatus(200);
});

// Export router
export {
    router
}
