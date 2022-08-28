import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Secrets } from 'secrets';
import { UserShort } from '../_entities/user-short';
import { getCookie, setCookie } from '../_helpers/cookieHelper';
import { MeService } from '../_services/me.service';

@Component({
  selector: 'app-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.css']
})
export class UserLayoutComponent implements OnInit {

  languages: string[] = [
    'sr-Latn',
    'sr-Cyrl',
    'en'
  ];
  selectedLanguage: string = this.languages[0];

  user: UserShort | null = null;

  constructor(private router: Router, private translateService: TranslateService, private meService: MeService) {
    let cookie = getCookie(Secrets.LANGUAGE);
    if (cookie != null && this.languages.indexOf(cookie) != -1) {
      this.onLanguageChange(cookie);
    }
  }

  ngOnInit(): void {
    this.meService.getInfo().subscribe((u: UserShort) => {
      this.user = u;
    });
  }

  logout(): void {
    this.meService.logout().subscribe(res => {
      this.router.navigate(['/login']);
    }, err => {
      console.log(err);
    });
  }

  onLanguageChange(language: string) {
    this.selectedLanguage = language;

    setCookie(Secrets.LANGUAGE, language);

    this.translateService.use(language);
  }

}
