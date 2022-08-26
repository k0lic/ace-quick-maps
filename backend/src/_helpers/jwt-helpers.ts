import { Secrets } from "../../secrets";

let jsonwebtoken = require('jsonwebtoken');

function createJwt(email: string, userType: string): any {
    return jsonwebtoken.sign({
        email: email,
        type: userType
    }, Secrets.JWT.SECRET, {
        expiresIn: '1h'
    });
}

function extractJwtContent(req , res): any {
    try {
        let token = req.cookies[Secrets.JWT.SESSION_ID];
        let verified = JSON.stringify(jsonwebtoken.verify(token, Secrets.JWT.SECRET));
        let content = JSON.parse(verified);
        return content;
    } catch (err) {
        clearJwt(res);
        return null;
    }
}

function clearJwt(res): void {
    res.clearCookie(Secrets.JWT.SESSION_ID);
}

export {
    createJwt,
    extractJwtContent,
    clearJwt
}