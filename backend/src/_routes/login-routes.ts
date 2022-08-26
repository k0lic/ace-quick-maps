import { Secrets } from "../../secrets";

declare var require: any;
let express = require('express');
let bcrypt = require('bcrypt');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let queryHelpers = require('../_helpers/query-helpers');
let stringHelpers = require('../_helpers/string-helpers');
let jwtHelpers = require('../_helpers/jwt-helpers');

// Make sure only guests have access - a logged in user should not be able to eg. log in
router.use(userCheckers.assertNoUser);

// List routes here
router.post('/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    let today = new Date();
    let todayString = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();

    // Check if user exists - approved and has not had access revoked
    let query = 'SELECT * FROM users WHERE email = ' + stringHelpers.quoteMe(email) + ' AND approved = 1 AND revoke_access_date > ' + stringHelpers.quoteMe(todayString);
    queryHelpers.executeQueryWithCallback(query, res, rows => {
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
            res.cookie(Secrets.JWT.SESSION_ID, token, {
                maxAge: 60 * 60 * 1000  // 1h (in milliseconds)
            });

            // Create another cookie that's used for 'dumb' page restriction by angular - not for security but for QOL
            res.cookie(Secrets.USER_TYPE, rows[0].user_type, {
                maxAge: 60 * 60 * 1000  // 1h (in milliseconds)
            });

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
        let revokeAccessDate: Date = new Date();
        let radString = (revokeAccessDate.getFullYear() + 1) + '-02-01';

        let query = 'INSERT INTO users (email, user_type, name, last_name, approved, password, revoke_access_date) VALUES ('
            + stringHelpers.quoteMe(email) + ','
            + stringHelpers.quoteMe('viewer') + ','
            + stringHelpers.quoteMe(name) + ','
            + stringHelpers.quoteMe(lastName) + ','
            + 0 + ','
            + stringHelpers.quoteMe(hash) + ','
            + stringHelpers.quoteMe(radString) + ')';
        
        queryHelpers.executeQueryWithoutResults(query, res);
    });
});

router.post('/forgot', (req, res) => {
    let email = req.body.email;

    let today = new Date();
    let todayString = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();

    // Check if user exists - approved and has not had access revoked
    let query = 'SELECT * FROM users WHERE email = ' + stringHelpers.quoteMe(email) + ' AND approved = 1 AND revoke_access_date > ' + stringHelpers.quoteMe(todayString);
    queryHelpers.executeQueryWithCallback(query, res, rows => {
        if (rows.length == 0) {
            console.log('User not found');
            res.sendStatus(500);
            return;
        }

        // TODO: create password_reset_code entry for this user, and send them a reset email

        res.sendStatus(200);
    }, null);
});

// Export router
export {
    router
}