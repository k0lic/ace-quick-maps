import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { User } from '../_entities/user';
import { UserType } from '../_entities/user-type';
import { optionsWithCookie, optionsWithCookieEmpty, uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  getActiveUsers() {
    return this.http.get<User[]>(uri + '/users/active_users', optionsWithCookie);
  }

  getExpiredUsers() {
    return this.http.get<User[]>(uri + '/users/expired_users', optionsWithCookie);
  }

  getUserRequests() {
    return this.http.get<User[]>(uri + '/users/user_requests', optionsWithCookie);
  }

  getUserTypes() {
    return this.http.get<UserType[]>(uri + '/users/types', optionsWithCookie);
  }

  approveUser(user: string, type: string) {
    let data = {
      user: user,
      type: type
    };

    return this.http.post(uri + '/users/approve_user', data, optionsWithCookieEmpty);
  }

  deleteRequest(user: string) {
    let data = {
      user: user
    };

    return this.http.post(uri + '/users/delete_request', data, optionsWithCookieEmpty);
  }

  changeUserType(user: string, type: string) {
    let data = {
      user: user,
      type: type
    };

    return this.http.post(uri + '/users/change_user_type', data, optionsWithCookieEmpty);
  }

  revokeAccess(user: string) {
    let data = {
      user: user
    };

    return this.http.post(uri + '/users/revoke_access', data, optionsWithCookieEmpty);
  }

  renewAccess(user: string) {
    let data = {
      user: user
    };

    return this.http.post(uri + '/users/renew_access', data, optionsWithCookieEmpty);
  }
}
