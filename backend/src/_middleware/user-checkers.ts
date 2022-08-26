let jwtHelpers = require('../_helpers/jwt-helpers');

// Make sure no one is logged in
function assertNoUser(req, res, next): void {
    let token = jwtHelpers.extractJwtContent(req, res);

    // Someone is logged in
    if (token != null) {
        res.sendStatus(403);
        return;
    }

    next();
}

// Make sure someone is logged in
function assertIsUser(req, res, next): void {
    let token = jwtHelpers.extractJwtContent(req, res);

    // No one is logged in
    if (token == null) {
        res.sendStatus(401);
        return;
    }

    // Check if user type is valid
    if (['viewer', 'user_manager', 'admin'].indexOf(token.type) == -1) {
        // Invalid user type
        jwtHelpers.clearJwt(res);
        res.sendStatus(401);
        return;
    }

    next();
}

// Make sure someone with access to user management is logged in
function assertIsManagerOrHigher(req, res, next): void {
    let token = jwtHelpers.extractJwtContent(req, res);

    // No one is logged in
    if (token == null) {
        res.sendStatus(401);
        return;
    }

    // User with less rights is logged in
    if (['user_manager', 'admin'].indexOf(token.type) == -1) {
        res.sendStatus(403);
        return;
    }

    next();
}

// Make sure admin is logged in
function assertIsAdmin(req, res, next): void {
    let token = jwtHelpers.extractJwtContent(req, res);

    // No one is logged in
    if (token == null) {
        res.sendStatus(401);
        return;
    }

    // User with less rights is logged in
    if (['admin'].indexOf(token.type) == -1) {
        res.sendStatus(403);
        return;
    }

    next();
}

export {
    assertNoUser,
    assertIsUser,
    assertIsManagerOrHigher,
    assertIsAdmin
}