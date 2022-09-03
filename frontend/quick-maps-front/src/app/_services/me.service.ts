import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserShort } from '../_entities/user-short';
import { optionsWithCookie, optionsWithCookieEmpty, uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class MeService {

  constructor(private http: HttpClient) { }
  
  getInfo() {
    return this.http.get<UserShort>(uri + '/me/get_info', optionsWithCookie);
  }
  
  logout() {
    return this.http.get(uri + '/me/logout', optionsWithCookieEmpty);
  }

  clearCookies() {
    return this.http.get(uri + '/logins/clear_cookies', optionsWithCookieEmpty);
  }
}
