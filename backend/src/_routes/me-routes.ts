import { Secrets } from "../../config/secrets";
import { Constants } from "../constants";

declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let jwtHelpers = require('../_helpers/jwt-helpers');

// Make sure only users have access
router.use(userCheckers.assertIsUser);

// List routes here
router.get('/get_info', (req, res) => {
    let content = jwtHelpers.extractJwtContent(req, res);
    res.status(200).send({
        email: content.email,
        name: content.name,
        lastName: content.lastName
    });
});

router.get('/logout', (req, res) => {
    jwtHelpers.clearJwt(res);
    res.clearCookie(Constants.USER_TYPE);
    res.sendStatus(200);
});

// Export router
export {
    router
}