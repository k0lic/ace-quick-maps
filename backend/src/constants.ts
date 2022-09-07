import { Environment } from "../config/environment";

export class Constants {
    public static USER_TYPE : string = 'USER_TYPE';
    public static PASSWORD_RESET = {
        CODE_LENGTH: 32
    };
    public static RESET_KEY_LENGTH: number = 32;
    public static MAIL_TEMPLATES = {
        WELCOME: {
            SUBJECT: '[ACE Oko] Pristup sajtu odobren',
            TEXT: 'Dobrodošli!<br/><br/>Pristup vebsajtu Vam je upravo odobren. Možete da nastavite ka vebsajtu klikom na <a href="' + Environment.WEBSITE_URL + '">link</a>.'
        },
        RESET: {
            SUBJECT: '[ACE Oko] Zahtev za promenom lozinke',
            TEXT: 'Poštovani,<br/><br/>Kako je zatražena promena lozinke za Vaš nalog, istu je moguće obaviti u kratkom roku klikom na <a href="' + Environment.WEBSITE_URL + '/reset-password/<reset-code>' + '">link</a>.<br/><br/>Ako Vi niste podneli ovaj zahtev, slobodno ignorišite ovaj mejl.'
        },
        ERROR_REPORT: {
            SUBJECT: '[ACE Oko] Izveštaj o greškama'
        },
        SIGNATURE: '<br/><br/><br/>ACE Oko<br/>Ovaj mejl je automatski generisan. Molimo Vas da ne šaljete mejlove na ovu adresu.'
    };
}
