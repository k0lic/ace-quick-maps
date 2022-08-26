declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let queryHelpers = require('../_helpers/query-helpers');

// Make sure only users have access
router.use(userCheckers.assertIsUser);

// List routes here
router.get('/all_point_types', (req, res) => {
    let query_string = 'SELECT * FROM point_types';
    queryHelpers.executeQuery(query_string, res);
});

// Export router
export {
    router
}