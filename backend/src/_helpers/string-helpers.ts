function quoteMe(s: any): string {
    return '\'' + s + '\'';
}

function escapeHtml(unsafe: string): string {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export {
    quoteMe,
    escapeHtml
}