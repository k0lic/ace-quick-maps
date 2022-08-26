function getCookie(name: string) {
    let cookie = document.cookie.split(';').find(c => c.trim().startsWith(name + '='));
    return cookie?.substring(cookie?.indexOf('=') + 1);
}

export {
    getCookie
}