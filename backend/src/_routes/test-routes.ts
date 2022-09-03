declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let queryHelpers = require('../_helpers/query-helpers');
let excelHelpers = require('../_helpers/excel-helpers');

// Make sure only 'admin' users have access
router.use(userCheckers.assertIsAdmin);

// List routes here
router.get('/process_excel_test_file', (req, res) => {
    excelHelpers.testExcelFunction(res);
});

// Export router
export {
    router
}