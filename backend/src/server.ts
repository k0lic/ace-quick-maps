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

// Program routes
router.get('/all_tour_programs', (req, res) => {
    let query_string = 'SELECT * FROM programs pr, partners pa WHERE pr.idpartner = pa.idpartner';  // join with partners might be unneeded
    executeQuery(query_string, res);
});

router.post('/tour_program_days', (req, res) => {
    let program_id = req.body.id;

    // TODO: what if there's a day without any points? that will be missed, no?
    let query_string = ''
        + 'SELECT * '
        + 'FROM program_days d, points p, locations l '
        + 'WHERE d.idprogram = \'' + program_id + '\' '
        + '     AND p.idprogram = d.idprogram AND p.daynumber = d.number '
        + '     AND l.name = p.location';
    executeQuery(query_string, res);
});

router.post('/add_program_day', (req, res) => {
    let program_id = req.body.id;
    let number = req.body.number;
    let description = req.body.description;

    let query_string = 'INSERT INTO program_days (idprogram, number, description) VALUES (\'' + program_id + '\',\'' + number + '\',\'' + description + '\')';
    executeQueryWithoutResults(query_string, res);
});

router.post('/delete_program_day', (req, res) => {
    // TODO: remove all the points first, yeah?
});

router.post('/add_point', (req, res) => {
    let program_id = req.body.id;
    let number = req.body.number;
    let point_index = req.body.index;
    let location = req.body.location;
    let type = req.body.type;
    let description = req.body.description;

    let query_string = 'INSERT INTO points (idprogram, daynumber, pointindex, location, idtype, description) '
        + 'VALUES ('
        + '\'' + program_id + '\','
        + '\'' + number + '\','
        + '\'' + point_index + '\','
        + '\'' + location + '\','
        + '\'' + type + '\','
        + '\'' + description + '\')';
    executeQueryWithoutResults(query_string, res);
});

router.post('/update_point', (req, res) => {
    let id = req.body.id;
    let point_index = req.body.index;
    let location = req.body.location;
    let type = req.body.type;
    let description = req.body.description;

    let query_string = 'UPDATE points '
        + 'SET pointindex = \'' + point_index + '\','
        + '     location = \'' + location + '\','
        + '     idtype = \'' + type + '\','
        + '     description = \'' + description + '\' '
        + 'WHERE idpoint = \'' + id + '\'';
    executeQueryWithoutResults(query_string, res);
});

router.post('/delete_point', (req, res) => {
    let id = req.body.id;

    let query_string = 'DELETE FROM points WHERE idpoint = \'' + id + '\'';
    executeQueryWithoutResults(query_string, res);
});

// Point Types routes
router.get('/all_point_types', (req, res) => {
    let query_string = 'SELECT * FROM point_types';
    executeQuery(query_string, res);
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