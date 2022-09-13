import { Secrets } from "../../config/secrets";
import { Constants } from "../constants";
import { getCookieExpireDate } from "./date-helpers";
import { coreCommitTransaction } from "./query-helpers";

declare var require: any;
let jsonwebtoken = require('jsonwebtoken');
let crypto = require('crypto');
let queryHelpers = require('./query-helpers');
let dateHelpers = require('./date-helpers');

// Angular dumb page access cookie
function setUserTypeCookie(res, userType: string): void {
    // Create another cookie that's used for 'dumb' page restriction by angular - not for security but for QOL
    res.cookie(Constants.USER_TYPE, userType, {
        expires: getCookieExpireDate()
    });
}

function clearUserTypeCookie(res): void {
    res.clearCookie(Constants.USER_TYPE);
}

// Access token
function createAccessToken(userRow: any): any {
    return jsonwebtoken.sign({
        email: userRow.email,
        type: userRow.user_type,
        name: userRow.name,
        lastName: userRow.last_name
    }, Secrets.JWT.SECRET, {
        expiresIn: '1h'
    });
}

function extractAccessTokenContent(req , res): any {
    try {
        let token = req.cookies[Secrets.JWT.SESSION_ID];
        let verified = JSON.stringify(jsonwebtoken.verify(token, Secrets.JWT.SECRET));
        let content = JSON.parse(verified);
        return content;
    } catch (err) {
        clearAccessToken(res);
        return null;
    }
}

function clearAccessToken(res): void {
    res.clearCookie(Secrets.JWT.SESSION_ID);
}

function setAccessToken(token, res): void {
    res.cookie(Secrets.JWT.SESSION_ID, token, {
        expires: getCookieExpireDate()
    });
}

// Refresh token
function createNewRefreshToken(email: string, res, successCallback, errCallback): void {
    forgeNewRefreshCode(code => {
        getNextRefreshTokenFamily(email, nextFamily => {
            saveRefreshTokenToDatabase(email, nextFamily, code, () => {
                let refreshToken = signRefreshToken(email, nextFamily, code);
                setRefreshToken(res, refreshToken);

                // Successful callback
                successCallback();
            }, errCallback);
        }, errCallback);
    }, errCallback);
}

// Try to create new access and refresh tokens, using the current refresh token - if one exists
function renewTokens(req, res, successCallback, failureCallback, errCallback): void {
    let refreshToken = extractRefreshTokenContent(req, res);

    if (refreshToken == null) {
        failureCallback();
        return;
    }

    let email = refreshToken.email;
    let family = refreshToken.family;
    let code = refreshToken.code;

    queryHelpers.coreBeginTransaction(() => {
        // Check the current refresh token's validity
        let fetchRenewTokenQueryString = ''
            + 'SELECT r.user, r.token_family, r.code, u.user_type, u.name, u.last_name '
            + 'FROM refresh_tokens r '
            + 'INNER JOIN users u '
            + 'ON u.email = r.user '
            + 'WHERE r.user = ? AND r.token_family = ? AND r.code = ? AND r.validity_date > ? AND u.approved = true AND u.revoke_access_date > ?';
        let todayString = dateHelpers.getYYYYMMDDdashed(new Date());
        let fetchRenewTokenQueryValues = [email, family, code, todayString, todayString];

        queryHelpers.coreExecuteQueryWithCallback(fetchRenewTokenQueryString, fetchRenewTokenQueryValues, rows => {
            if (rows.length == 0) {
                // The refresh token is not valid - it was already used / the code's validity expired - revoke the whole refresh token family
                revokeRefreshFamily(email, family, () => {
                    clearRefreshToken(res);
                    coreCommitTransaction(failureCallback, errCallback);
                }, err => rollbackCallback(err, errCallback));
                return;
            }

            // Create new refresh code
            forgeNewRefreshCode(newCode => {
                // Update refresh token DB entry
                updateRefreshToken(email, family, newCode, () => {
                    queryHelpers.coreCommitTransaction(() => {
                        // Set new refresh token - in the request as well
                        let newRefreshToken = signRefreshToken(email, family, newCode);
                        setRefreshToken(res, newRefreshToken);
                        req.cookies[Secrets.JWT.REFRESH_COOKIE] = newRefreshToken;

                        // Create and Set new access token - in the request as well
                        let rawAccessToken = {
                            email: rows[0].user,
                            user_type: rows[0].user_type,
                            name: rows[0].name,
                            last_name: rows[0].last_name
                        };
                        let accessToken = createAccessToken(rawAccessToken);
                        setAccessToken(accessToken, res);
                        req.cookies[Secrets.JWT.SESSION_ID] = accessToken;

                        // Set User Type to cookies - used on the frontend for page access restriction (QoL)
                        setUserTypeCookie(res, rows[0].user_type);

                        // Finish successfully
                        successCallback({
                            email: rawAccessToken.email,
                            type: rawAccessToken.user_type,
                            name: rawAccessToken.name,
                            lastName: rawAccessToken.last_name
                        });
                    }, errCallback);
                }, err => rollbackCallback(err, errCallback));
            }, err => rollbackCallback(err, errCallback));
        }, err => rollbackCallback(err, errCallback));
    }, errCallback);
}

function rollbackCallback(err, errCallback) {
    queryHelpers.coreRollbackTransaction(err, errCallback);
};

function deleteRefreshTokenIfExists(req, res, successCallback, errCallback): void {
    let refreshToken = extractRefreshTokenContent(req, res);

    // Refresh token does not exist
    if (refreshToken == null) {
        clearRefreshToken(res);
        successCallback();
        return;
    }

    let email = refreshToken.email;
    let family = refreshToken.family;

    // Delete token from DB
    revokeRefreshFamily(email, family, () => {
        // Clear cookie
        clearRefreshToken(res);

        successCallback();
    }, errCallback);
}

function clearRefreshToken(res): void {
    res.clearCookie(Secrets.JWT.REFRESH_COOKIE);
}

function extractRefreshTokenContent(req , res): any {
    try {
        let token = req.cookies[Secrets.JWT.REFRESH_COOKIE];
        let verified = JSON.stringify(jsonwebtoken.verify(token, Secrets.JWT.REFRESH_SECRET));
        let content = JSON.parse(verified);
        return content;
    } catch (err) {
        clearRefreshToken(res);
        return null;
    }
}

function signRefreshToken(email: string, family: string, code: string): any {
    return jsonwebtoken.sign({
        email: email,
        family: family,
        code: code
    }, Secrets.JWT.REFRESH_SECRET);
}

function setRefreshToken(res, token: any): void {
    // Set cookie
    res.cookie(Secrets.JWT.REFRESH_COOKIE, token, {
        expires: getCookieExpireDate()
    });
}

function forgeNewRefreshCode(successCallback, errCallback): void {
    // Create random string to be used as refresh token
    crypto.randomBytes(Constants.REFRESH_TOKEN.CODE_LENGTH, (err, buf) => {
        if (err) {
            errCallback(err);
            return;
        }

        let code = buf.toString('hex');
        successCallback(code);
    });
}

function getNextRefreshTokenFamily(email, successCallback, errCallback) {
    // Get new family code - (max of highest family for user) + 1
    let nextFamilyQueryString = 'SELECT coalesce(max(token_family), 0) + 1 as `next_family` FROM refresh_tokens WHERE user = ?';
    let nextFamilyQueryValues = [email];

    queryHelpers.coreExecuteQueryWithCallback(nextFamilyQueryString, nextFamilyQueryValues, rows => {
        let nextFamily = rows[0].next_family;
        successCallback(nextFamily);
    }, errCallback);
}

function saveRefreshTokenToDatabase(email, family, code, successCallback, errCallback) {
    let queryString = 'INSERT INTO refresh_tokens (user, token_family, code, validity_date) VALUES ?';
    let queryValues = [[[email, family, code, dateHelpers.getYYYYMMDDdashed(getNewRefreshTokenValidity())]]];

    queryHelpers.coreExecuteQueryWithCallback(queryString, queryValues, rows => successCallback(), errCallback);
}

function updateRefreshToken(email: string, family: number, code: string, successCallback, errCallback) {
    let queryString = 'UPDATE refresh_tokens SET code = ?, validity_date = ? WHERE user = ? AND token_family = ?';
    let queryValues = [code, dateHelpers.getYYYYMMDDdashed(getNewRefreshTokenValidity()), email, family];

    queryHelpers.coreExecuteQueryWithCallback(queryString, queryValues, rows => successCallback(), errCallback);
}

function revokeRefreshFamily(email: string, family: number, successCallback, errCallback) {
    let queryString = 'DELETE FROM refresh_tokens WHERE user = ? AND token_family = ?';
    let queryValues = [email, family];

    queryHelpers.coreExecuteQueryWithCallback(queryString, queryValues, rows => successCallback(), errCallback);
}

function getNewRefreshTokenValidity(): Date {
    let validity = new Date();
    // Set validity for 7 days from now
    validity.setDate(validity.getDate() + 7);
    return validity;
}

export {
    setUserTypeCookie,
    clearUserTypeCookie,
    createAccessToken,
    setAccessToken,
    extractAccessTokenContent,
    clearAccessToken,
    createNewRefreshToken,
    renewTokens,
    deleteRefreshTokenIfExists
}