export class Constants {
    public static USER_TYPE : string = 'USER_TYPE';
    public static WEBSITE_URL: string = 'http://localhost:4200';
    public static MAIL_TEMPLATES = {
        WELCOME: {
            SUBJECT: '[ACE Oko] Pristup sajtu odobren',
            TEXT: 'Dobrodošli!<br/><br/>Pristup vebsajtu Vam je upravo odobren. Možete da nastavite ka vebsajtu klikom na <a href="' + Constants.WEBSITE_URL + '">link</a>.'
        },
        SIGNATURE: '<br/><br/><br/>ACE Oko<br/>Ovaj mejl je automatski generisan. Molimo Vas da ne šaljete mejlove na ovu adresu.'
    };
}