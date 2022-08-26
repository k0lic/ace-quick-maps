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
    // allowedHeaders: ['Content-Type', 'Authorization'],
    // exposedHeaders: ['Content-Type'],
    // allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Content-Disposition'],
    // exposedHeaders: ['Content-Type', 'Content-Disposition'],
    optionsSuccessStatus: 200,
    credentials: true
}));

// parsers
app.use(bodyParser.json());
app.use(cookieParser());

// jwt
// const secret = Secrets.JWT.SECRET;
// const SESSION_ID = Secrets.JWT.SESSION_ID;

// function verifyUser(req, res): boolean {
//     console.log('req.cookies: ' + JSON.stringify(req.cookies));
//     try {
//         let token = req.cookies[SESSION_ID];
//         jsonwebtoken.verify(token, secret);
//         return true;
//     } catch (err) {
//         res.clearCookie(SESSION_ID);
//         res.sendStatus(401);
//         return false;
//     }
// }

// function getTokenInfo(req , res): string | null {
//     console.log('req.cookies: ' + JSON.stringify(req.cookies));
//     try {
//         let token = req.cookies[SESSION_ID];
//         let verified = JSON.stringify(jsonwebtoken.verify(token, secret));
//         let info = JSON.parse(verified);
//         console.log(info);
//         return info;
//     } catch (err) {
//         res.clearCookie(SESSION_ID);
//         res.sendStatus(401);
//         return null;
//     }
// }

// Database Connection
// requiring the file executes the initialization code
let queryHelpers = require('./_helpers/query-helpers');

// !!! Routes
// Default routes
let router = express.Router();

router.get('/', (req, res) => {
    console.log('cookies at start: ' + JSON.stringify(res.cookies));
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

// Test file routes
let testRoutes = require('./_routes/test-routes');
app.use('/test', testRoutes.router);

// !!! Setup post-Routes
app.listen(4000, () => console.log('Express server running on port 4000'));