import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { optionsWithCookieEmpty, uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  constructor(private http: HttpClient) { }

  login(emailAddress: string, password: string) {
    let data = {
      email: emailAddress,
      password: password
    };

    return this.http.post(uri + '/logins/login', data, optionsWithCookieEmpty);
  }

  register(emailAddress: string, password: string, name: string, lastName: string) {
    let data = {
      email: emailAddress,
      password: password,
      name: name,
      last: lastName
    };

    return this.http.post(uri + '/logins/register', data, optionsWithCookieEmpty);
  }

  forgotPassword(emailAddress: string) {
    let data = {
      email: emailAddress
    };

    return this.http.post(uri + '/logins/forgot', data, optionsWithCookieEmpty);
  }

  checkResetCode(code: string) {
    let data = {
      code: code
    };

    return this.http.post(uri + '/logins/reset_code_check', data, optionsWithCookieEmpty);
  }

  resetPassword(code: string, password: string) {
    let data = {
      code: code,
      password: password
    };

    return this.http.post(uri + '/logins/reset_password', data, optionsWithCookieEmpty);
  }
}
