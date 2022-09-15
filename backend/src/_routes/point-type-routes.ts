import { respondWith200, respondWith500 } from "../_helpers/http-responses";
import { executeQuery } from "../_helpers/query-helpers";

declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');

// Make sure only users have access
router.use(userCheckers.assertIsUser);

// List routes here
router.get('/all_point_types', (req, res) => {
    let queryString = 'SELECT * FROM point_types';
    executeQuery(queryString, [], rows => respondWith200(res, rows), err => respondWith500(res, err));
});

// Export router
export {
    router
}