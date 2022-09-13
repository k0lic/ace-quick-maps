import { normalLog } from "../_helpers/logger";

declare var require: any;
let jwtHelpers = require('../_helpers/jwt-helpers');

// Make sure no one is logged in
function assertNoUser(req, res, next): void {
    getAccessTokenWithRefreshIfNeeded(req, res, token => {
        // Someone is logged in
        res.sendStatus(403);
    }, () => {
        // No one is logged in
        next();
    });
}

// Make sure someone is logged in
function assertIsUser(req, res, next): void {
    getAccessTokenWithRefreshIfNeeded(req, res, token => {
        // Check if user type is valid
        if (['viewer', 'user_manager', 'admin'].indexOf(token.type) == -1) {
            // Invalid user type
            jwtHelpers.clearAccessToken(res);
            res.sendStatus(401);
            return;
        }

        next();
    }, () => {
        // No one is logged in
        res.sendStatus(401);
    });
}

// Make sure someone with access to user management is logged in
function assertIsManagerOrHigher(req, res, next): void {
    getAccessTokenWithRefreshIfNeeded(req, res, token => {
        // User with less rights is logged in
        if (['user_manager', 'admin'].indexOf(token.type) == -1) {
            res.sendStatus(403);
            return;
        }

        next();
    }, () => {
        // No one is logged in
        res.sendStatus(401);
    });
}

// Make sure admin is logged in
function assertIsAdmin(req, res, next): void {
    getAccessTokenWithRefreshIfNeeded(req, res, token => {
        // User with less rights is logged in
        if (['admin'].indexOf(token.type) == -1) {
            res.sendStatus(403);
            return;
        }

        next();
    }, () => {
        // No one is logged in
        res.sendStatus(401);
    });
}

function getAccessTokenWithRefreshIfNeeded(req, res, successCallback, failureCallback): any {
    // Extract access token from cookie
    let accessToken = jwtHelpers.extractAccessTokenContent(req, res);

    // If access token is valid - just pass it on
    if (accessToken != null) {
        successCallback(accessToken);
        return;
    }

    // If access token is not valid - try using the refresh token
    jwtHelpers.renewTokens(req, res, token => {
        successCallback(token);
    }, failureCallback, err => {
        normalLog(err);
        res.sendStatus(500);
    });
}

export {
    assertNoUser,
    assertIsUser,
    assertIsManagerOrHigher,
    assertIsAdmin
}