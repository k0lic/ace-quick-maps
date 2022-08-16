declare var require: any;
let express = require('express');
let cors = require('cors');
let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');

// !!! Setup pre-Routes
const app = express();

// Setup Cross-Origin Resource Sharing
app.use(cors({
    origin: [/((http|https):\/\/)?localhost/],
    optionsSuccessStatus: 200
}));

// parsers
app.use(bodyParser.json());
app.use(cookieParser());

// Database Connection
let mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'quick_maps_schema'
});
connection.connect((err) => {
    if (err) {
        console.error('error connecting to the DB: ' + err.stack);
        return;
    }

    console.log('Successfully connected to the DB!');
});

// !!! Routes
let router = express.Router();

router.get('/', (req, res) => {
    res.status(200).send('Hello from the new EXPRESS server! PogO');
});

// Location routes
router.get('/all_locations', (req, res) => {
    let query_string = 'SELECT * FROM `locations`';
    executeQuery(query_string, res);
});

router.post('/add_location', (req, res) => {
    let name = req.body.name;
    let lat = req.body.lat;
    let lng = req.body.lng;

    let query_string = 'INSERT INTO `locations` (`name`, `lat`, `lng`) VALUES (\'' + name + '\',\'' + lat + '\',\'' + lng + '\')';
    executeQueryWithoutResults(query_string, res);
});

router.post('/move_location', (req, res) => {
    let name = req.body.name;
    let lat = req.body.lat;
    let lng = req.body.lng;

    let query_string = 'UPDATE `locations` SET `lat` = \'' + lat + '\', `lng` = \'' + lng + '\' WHERE (`name` = \'' + name + '\')';
    executeQueryWithoutResults(query_string, res);
});

router.post('/delete_location', (req, res) => {
    let name = req.body.name;

    let query_string = 'DELETE FROM `quick_maps_schema`.`locations` WHERE (`name` = \'' + name + '\')';
    executeQueryWithoutResults(query_string, res);
});

// Query helpers
function executeQueryWithoutResults(query_string: string, res): void {
    connection.query(query_string, (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        res.sendStatus(200);
    });
}

function executeQuery(query_string: string, res): void {
    connection.query(query_string, (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        res.status(200).send(rows);
    });
}

// !!! Setup post-Routes
app.use("/", router);
app.listen(4000, () => console.log('Express server running on port 4000'));