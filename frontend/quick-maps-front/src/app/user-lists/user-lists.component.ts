import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { User } from '../_entities/user';
import { UserType } from '../_entities/user-type';
import { setTitle } from '../_helpers/titleHelper';
import { UserService } from '../_services/user.service';

interface UserItem {
  email: string;
  name: string;
  lastName: string;
  type: string;
  newType: string;
}

@Component({
  selector: 'app-user-lists',
  templateUrl: './user-lists.component.html',
  styleUrls: ['./user-lists.component.css']
})
export class UserListsComponent implements OnInit {

  selectedUser: string | null = null;
  userRequests: UserItem[] = [];
  expiredUsers: UserItem[] = [];
  activeUsers: UserItem[] = [];

  userTypes: UserType[] = [];

  constructor(
    private titleService: Title,
    private translateService: TranslateService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    // Fetch user requests
    this.userService.getUserRequests().subscribe((requests: User[]) => {
      requests.forEach(user => {
        this.userRequests.push(this.itemFromUser(user));
      });
    }, err => {
      // Layout will perform redirect if necessary
      console.log(err);
    });

    // Fetch expired users
    this.userService.getExpiredUsers().subscribe((expireds: User[]) => {
      expireds.forEach(user => {
        this.expiredUsers.push(this.itemFromUser(user));
      });
    }, err => {
      // Layout will perform redirect if necessary
      console.log(err);
    });

    // Fetch active users
    this.userService.getActiveUsers().subscribe((actives: User[]) => {
      actives.forEach(user => {
        this.activeUsers.push(this.itemFromUser(user));
      });
    }, err => {
      // Layout will perform redirect if necessary
      console.log(err);
    });

    // Fetch user types
    this.userService.getUserTypes().subscribe((types: UserType[]) => {
      this.userTypes = types;
    }, err => {
      // Layout will perform redirect if necessary
      console.log(err);
    });
    
    setTitle('USERS.ALL', this.titleService, this.translateService);
  }

  approveUser(index: number): void {
    let item = this.userRequests[index];
    let user = item.email;
    let type = item.newType;

    this.userService.approveUser(user, type).subscribe(res => {
      // User successfully approved, update ui
      this.activeUsers.push({
        email: user,
        name: item.name,
        lastName: item.lastName,
        type: type,
        newType: type
      });

      this.userRequests.splice(index, 1);
    }, err => {
      console.log(err);
    });
  }

  deleteRequest(index: number): void {
    let item = this.userRequests[index];
    let user = item.email;

    this.userService.deleteRequest(user).subscribe(res => {
      // Request successfully deleted, update ui
      this.userRequests.splice(index, 1);
    }, err => {
      console.log(err);
    });
  }

  changeActivesType(index: number): void {
    this.changeUsersType(index, this.activeUsers);
  }

  changeExpiredsType(index: number): void {
    this.changeUsersType(index, this.expiredUsers);
  }

  changeUsersType(index: number, collection: UserItem[]): void {
    let item = collection[index];
    let user = item.email;
    let type = item.newType;

    this.userService.changeUserType(user, type).subscribe(res => {
      // User's type successfully changed, update ui
      collection[index].type = type;
    }, err => {
      console.log(err);
    });
  }

  revokeUsersAccess(index: number): void {
    let item = this.activeUsers[index];
    let user = item.email;

    this.userService.revokeAccess(user).subscribe(res => {
      // User's access successfully revoked, update ui
      this.expiredUsers.push({
        email: user,
        name: item.name,
        lastName: item.lastName,
        type: item.type,
        newType: item.newType
      });

      this.activeUsers.splice(index, 1);
    }, err => {
      console.log(err);
    });
  }

  renewUsersAccess(index: number): void {
    let item = this.expiredUsers[index];
    let user = item.email;

    this.userService.renewAccess(user).subscribe(res => {
      // User's access successfully renewed, update ui
      this.activeUsers.push({
        email: user,
        name: item.name,
        lastName: item.lastName,
        type: item.type,
        newType: item.newType
      });

      this.expiredUsers.splice(index, 1);
    }, err => {
      console.log(err);
    });
  }

  updateType(event: any, index: number, collection: any[]): void {
    collection[index].newType = event;
  }

  itemFromUser(user: User): UserItem {
    return {
      email: user.email,
      name: user.name,
      lastName: user.last_name,
      type: user.user_type,
      newType: user.user_type
    };
  }

}
