import { Secrets } from "../../secrets";

declare var require: any;
let nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: Secrets.EMAIL.ADDRESS,
        pass: Secrets.EMAIL.PASSWORD
    }
});

function sendMail(to: string, subject: string, text: string, callback, errCallback): void {
    // Construct email
    let mailOptions = {
        from: Secrets.EMAIL.ADDRESS,
        to: to,
        subject: subject,
        html: text
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