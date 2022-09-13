import { HttpErrorResponse } from "@angular/common/http";
import { MeService } from "../_services/me.service";

function consoleLog(err: HttpErrorResponse, router: any, meService: MeService | null, callbacks: any[]): void {
    console.log(err);
}

function checkForUnauthorized(err: HttpErrorResponse, router: any, meService: MeService, callbacks: any[]): void {
    if (err.status == 401) {
        handle401(router, meService);
    } else {
        if (callbacks.length > 0) {
            callbacks[0](err, router, meService, callbacks.slice(1));
        }
    }
}

function handle401(router: any, meService: MeService): void {
    meService.clearCookies().subscribe(res => {
        redirectToLogin(router);
    }, consoleLogShortSignature);
}

function redirectToLogin(router: any): void {
    router.navigate(['/login']);
}

// Don't use as part of a chain of handlers, since it doesn't have the needed signature
function consoleLogShortSignature(err: HttpErrorResponse): void {
    consoleLog(err, null, null, []);
}

export {
    consoleLog,
    checkForUnauthorized,
    consoleLogShortSignature
}