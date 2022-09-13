import { HttpErrorResponse } from "@angular/common/http";
import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { checkForUnauthorized, consoleLog } from "../_helpers/errHandler";
import { MeService } from "../_services/me.service";

@Component({
    template: ''
})
export class LoggedInComponent {

    constructor(
        protected router: Router,
        protected meService: MeService
    ) { }

    protected checkErrUnauthorized(err: HttpErrorResponse): void {
        console.log(this.meService);
        checkForUnauthorized(err, this.router, this.meService, [consoleLog]);
    }

    protected checkErrUnauthorizedCustom(err: HttpErrorResponse, callbacks: any[]): void {
        checkForUnauthorized(err, this.router, this.meService, callbacks);
    }

}