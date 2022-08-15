import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
  origin: [/((http|https):\/\/)?localhost/],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Content-Disposition'],
  exposedHeaders: ['Content-Type', 'Content-Disposition'],
  optionsSuccessStatus: 200,
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

let router = express.Router();

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

router.get('/locations_get', (req, res) => {
  res.status(200).send(69);
})

module.exports = router;