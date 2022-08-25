declare var require: any;
let express = require('express');

let router = express.Router();

let queryHelpers = require('../_helpers/query-helpers');
let excelHelpers = require('../_helpers/excel-helpers');

// List routes here
router.get('/process_excel_test_file', (req, res) => {
    excelHelpers.testExcelFunction(res);
});

// Export router
export {
    router
}