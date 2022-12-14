import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Secrets } from 'secrets';
import { LoggedInComponent } from '../_abstracts/logged-in.component';
import { UserShort } from '../_entities/user-short';
import { getCookie, setCookie } from '../_helpers/cookieHelper';
import { MeService } from '../_services/me.service';

@Component({
  selector: 'app-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.css']
})
export class UserLayoutComponent extends LoggedInComponent implements OnInit {

  languages: string[] = [
    'sr-Latn',
    'sr-Cyrl',
    'en'
  ];
  selectedLanguage: string = this.languages[0];

  user: UserShort | null = null;
  isHigher: boolean = false;
  isAdmin: boolean = false;

  isCollapsed: boolean = true;

  constructor(
    protected router: Router, 
    protected meService: MeService, 
    private translateService: TranslateService 
  ) {
    super(router, meService);
    
    let cookie = getCookie(Secrets.LANGUAGE);
    if (cookie != null && this.languages.indexOf(cookie) != -1) {
      this.onLanguageChange(cookie);
    }
  }

  ngOnInit(): void {
    this.meService.getInfo().subscribe((u: UserShort) => {
      this.user = u;
    // Check the err status code - if it's 401 that means that we have invalid cookies and need to delete them
    // The client sees the cookies and think's the user is logged in, while the server can understand that the content of the cookies has expired
    }, err => this.checkErrUnauthorized(err));

    // Check user type in order to know which (if any) nav menu options to show
    this.checkUserType();
  }

  logout(): void {
    this.meService.logout().subscribe(res => {
      this.router.navigate(['/login']);
    }, err => this.checkErrUnauthorized(err));
  }

  onLanguageChange(language: string) {
    this.selectedLanguage = language;

    setCookie(Secrets.LANGUAGE, language);

    this.translateService.use(language);
  }

  checkUserType(): void {
    let cookie = getCookie(Secrets.USER_TYPE);

    if (cookie != null && ['user_manager', 'admin'].indexOf(cookie) != -1) {
      this.isHigher = true;
    }

    if (cookie != null && ['admin'].indexOf(cookie) != -1) {
      this.isAdmin = true;
    }
  }

}
