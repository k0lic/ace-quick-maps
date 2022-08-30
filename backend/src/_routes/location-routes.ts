declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let queryHelpers = require('../_helpers/query-helpers');

// Make sure only 'admin' users have access
router.use(userCheckers.assertIsAdmin);

// List routes here
router.get('/all_locations', (req, res) => {
    let queryString = 'SELECT * FROM locations';
    queryHelpers.executeQuery(queryString, [], res);
});

router.post('/add_location', (req, res) => {
    let name = req.body.name;
    let lat = req.body.lat;
    let lng = req.body.lng;

    // let query_string = 'INSERT INTO `locations` (`name`, `lat`, `lng`) VALUES (\'' + name + '\',\'' + lat + '\',\'' + lng + '\')';
    let queryString = 'INSERT INTO locations (name, lat, lng) VALUES ?';
    let queryValues = [[[name, lat, lng]]];
    queryHelpers.executeQueryWithoutResults(queryString, queryValues, res);
});

router.post('/move_location', (req, res) => {
    let name = req.body.name;
    let lat = req.body.lat;
    let lng = req.body.lng;

    // let query_string = 'UPDATE `locations` SET `lat` = \'' + lat + '\', `lng` = \'' + lng + '\' WHERE (`name` = \'' + name + '\')';
    let queryString = 'UPDATE locations SET lat = ?, lng = ? WHERE name = ?';
    let queryValues = [lat, lng, name];
    queryHelpers.executeQueryWithoutResults(queryString, queryValues, res);
});

router.post('/delete_location', (req, res) => {
    let name = req.body.name;

    // let query_string = 'DELETE FROM `quick_maps_schema`.`locations` WHERE (`name` = \'' + name + '\')';
    let queryString = 'DELETE FROM locations WHERE name = ?';
    let queryValues = [name];
    queryHelpers.executeQueryWithoutResults(queryString, queryValues, res);
});

// Export router
export {
    router
}