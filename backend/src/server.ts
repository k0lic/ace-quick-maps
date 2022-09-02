import { Environment } from "../environment";

declare var require: any;
let express = require('express');
let cors = require('cors');
let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');

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

// Test file routes
let testRoutes = require('./_routes/test-routes');
app.use('/test', testRoutes.router);

// !!! Setup post-Routes
app.listen(4000, () => console.log('Express server running on port 4000'));
