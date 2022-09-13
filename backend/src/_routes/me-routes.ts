import { Secrets } from "../../config/secrets";
import { Constants } from "../constants";
import { normalLog } from "../_helpers/logger";

declare var require: any;
let express = require('express');

let router = express.Router();

let userCheckers = require('../_middleware/user-checkers');
let jwtHelpers = require('../_helpers/jwt-helpers');

// Make sure only users have access
router.use(userCheckers.assertIsUser);

// List routes here
router.get('/get_info', (req, res) => {
    let content = jwtHelpers.extractAccessTokenContent(req, res);
    res.status(200).send({
        email: content.email,
        name: content.name,
        lastName: content.lastName
    });
});

router.get('/logout', (req, res) => {
    // Delete Refresh Token, Access Token and User Type (used for frontend page access control) cookies
    jwtHelpers.deleteRefreshTokenIfExists(req, res, () => {
        jwtHelpers.clearAccessToken(res);
        jwtHelpers.clearUserTypeCookie(res);
        res.sendStatus(200);
    }, err => {
        normalLog(err);
        res.sendStatus(500);
    });
});

// Export router
export {
    router
}