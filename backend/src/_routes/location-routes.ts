import { respondWith200, respondWith500, respondWithJust200 } from "../_helpers/http-responses";
import { normalLog } from "../_helpers/logger";
import { executeQuery } from "../_helpers/query-helpers";

declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');

// Make sure only 'admin' users have access
router.use(userCheckers.assertIsAdmin);

// List routes here
router.get('/all_locations', (req, res) => {
    let queryString = 'SELECT * FROM locations';
    executeQuery(queryString, [], rows => respondWith200(res, rows), err => respondWith500(res, err));
});

router.post('/add_location', (req, res) => {
    let name = req.body.name;
    let lat = req.body.lat;
    let lng = req.body.lng;

    let queryString = 'INSERT INTO locations (name, lat, lng) VALUES ?';
    let queryValues = [[[name, lat, lng]]];
    executeQuery(queryString, queryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
});

router.post('/move_location', (req, res) => {
    let name = req.body.name;
    let lat = req.body.lat;
    let lng = req.body.lng;

    let queryString = 'UPDATE locations SET lat = ?, lng = ? WHERE name = ?';
    let queryValues = [lat, lng, name];
    executeQuery(queryString, queryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
});

router.post('/delete_location', (req, res) => {
    let name = req.body.name;

    let queryString = 'DELETE FROM locations WHERE name = ?';
    let queryValues = [name];
    executeQuery(queryString, queryValues, rows => respondWithJust200(res), err => respondWith500(res, err));
});

// Export router
export {
    router
}