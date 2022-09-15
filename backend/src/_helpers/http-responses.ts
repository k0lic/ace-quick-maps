import { normalLog } from "./logger";

function respondWith500(res, err): void {
    normalLog(err);
    res.sendStatus(500);
}

function respondWithJust200(res): void {
    res.sendStatus(200);
}

function respondWith200(res, rows): void {
    res.status(200).send(rows);
}

export {
    respondWith500,
    respondWithJust200,
    respondWith200
}