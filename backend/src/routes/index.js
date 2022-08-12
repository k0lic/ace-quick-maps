var express = require('express');
var router = express.Router();

// DB connection

const mysql = require('mysql')
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'quick_maps_schema'
})

connection.connect((err) => {
  if (err) {
    console.error('error connecting to the DB: ' + err.stack);
    return;
  }

  console.log('Successfully connected to the DB!');
})

// Routes

router.get('/', function(req, res, next) {
  return res.status(200).json({ message: 'Welcome to quick-maps-back! KEKW' });
});

module.exports = router;