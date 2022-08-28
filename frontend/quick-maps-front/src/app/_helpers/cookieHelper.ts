function getCookie(name: string) {
    let cookie = document.cookie.split(';').find(c => c.trim().startsWith(name + '='));
    return cookie?.substring(cookie?.indexOf('=') + 1);
}

function setCookie(name: string, value: string) {
    document.cookie = `${name}=${value}`;
}

export {
    getCookie,
    setCookie
}