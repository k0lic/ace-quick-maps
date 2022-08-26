import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { Secrets } from "secrets";
import { getCookie } from "../_helpers/cookieHelper";

// Only lets guests through
@Injectable()
export class UserGuard implements CanActivate {
    
    constructor(private router: Router) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        let cookie = getCookie(Secrets.USER_TYPE);

        if (cookie == null) {
            this.router.navigate(['/login']);
            return false;
        }

        return true;
    }
}