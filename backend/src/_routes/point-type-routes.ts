declare var require: any;
let express = require('express');

let router = express.Router();

let queryHelpers = require('../_helpers/query-helpers');

// List routes here
router.get('/all_point_types', (req, res) => {
    let query_string = 'SELECT * FROM point_types';
    queryHelpers.executeQuery(query_string, res);
});

// Export router
export {
    router
}