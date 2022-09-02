import { Secrets } from "../../secrets";
import { Constants } from "../constants";

declare var require: any;
let nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: Secrets.EMAIL.ADDRESS,
        pass: Secrets.EMAIL.PASSWORD
    },
    connectionTimeout: 5 * 1000     // 5 seconds - might be too short, change if you have issues with smtp timeouts
});

function sendMail(to: string, subject: string, text: string, callback, errCallback): void {
    // Construct email
    let mailOptions = {
        from: Secrets.EMAIL.ADDRESS,
        to: to,
        subject: subject,
        html: text + Constants.MAIL_TEMPLATES.SIGNATURE     // automatically add signature to mail content
    };

    // Send email
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            errCallback(err);
            return;
        }

        callback(info);
    });
}

// Send email and console log if there's an error
function sendMailConsoleLog(to: string, subject: string, text: string): void {
    sendMail(to, subject, text, info => {
        // skip
    }, err => {
        console.log(err);
    });
}

export {
    sendMail,
    sendMailConsoleLog
}