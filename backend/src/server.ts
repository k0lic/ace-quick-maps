import { Environment } from "../config/environment";
import { timeStampLog } from "./_helpers/logger";

declare var require: any;
let express = require('express');
let cors = require('cors');
let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');
let fs = require('fs');
let https = require('https');

// !!! Setup pre-Routes
const app = express();

// Setup Cross-Origin Resource Sharing
app.use(cors({
    origin: [Environment.CORS_ORIGIN],
    optionsSuccessStatus: 200,
    credentials: true
}));

// parsers
app.use(bodyParser.json());
app.use(cookieParser());

// Database Connection - requiring the file executes the initialization code
let queryHelpers = require('./_helpers/query-helpers');

// Initialize the mail helper
let mailHelpers = require('./_helpers/mail-helpers');

// Setup cron jobs
let datasetRefresherCrons = require('./_cron/dataset-refresher');
let backupCrons = require('./_cron/db-backup');

// !!! Routes
// Default routes
let router = express.Router();

router.get('/', (req, res) => {
    res.status(200).send('Hello from the new EXPRESS server! PogO');
});

app.use("/", router);

// Location routes
let locationRoutes = require('./_routes/location-routes');
app.use('/locations', locationRoutes.router);

// Program routes
let programRoutes = require('./_routes/program-routes');
app.use('/programs', programRoutes.router);

// Tour routes
let tourRoutes = require('./_routes/tour-routes');
app.use('/tours', tourRoutes.router);

// Point Types routes
let pointTypeRoutes = require('./_routes/point-type-routes');
app.use('/point-types', pointTypeRoutes.router);

// Login routes
let loginRoutes = require('./_routes/login-routes');
app.use('/logins', loginRoutes.router);

// Me routes
let meRoutes = require('./_routes/me-routes');
app.use('/me', meRoutes.router);

// User routes
let userRoutes = require('./_routes/user-routes');
app.use('/users', userRoutes.router);

// Stat routes
let statRoutes = require('./_routes/stat-routes');
app.use('/stats', statRoutes.router);

// ENABLE DURING TESTING ONLY
// let testRoutes = require('./_routes/test-routes');
// app.use('/test', testRoutes.router);

// !!! Setup post-Routes
if (Environment.SSL.ENABLED) {
    // SSL Certificate
    let sslPrivateKey = fs.readFileSync(Environment.SSL.KEY_PATH, 'utf8');
    let sslCertificate = fs.readFileSync(Environment.SSL.CERT_PATH, 'utf8');
    let sslCredentials = {
        key: sslPrivateKey,
        cert: sslCertificate
    };

    // Https server
    let httpsServer = https.createServer(sslCredentials, app);

    httpsServer.listen(4000, () => {
        timeStampLog('Express https server listening on port 4000');
    });
} else {
    // Http server
    app.listen(4000, () => {
        timeStampLog('Express unsecure server listening on port 4000')
    });
}
