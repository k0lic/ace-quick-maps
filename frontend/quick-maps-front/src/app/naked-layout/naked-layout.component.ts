import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Secrets } from 'secrets';
import { getCookie, setCookie } from '../_helpers/cookieHelper';

@Component({
  selector: 'app-naked-layout',
  templateUrl: './naked-layout.component.html',
  styleUrls: ['./naked-layout.component.css']
})
export class NakedLayoutComponent implements OnInit {

  languages: string[] = [
    'sr-Latn',
    'sr-Cyrl',
    'en'
  ];
  selectedLanguage: string = this.languages[0];

  constructor(private translateService: TranslateService) {
    let cookie = getCookie(Secrets.LANGUAGE);
    if (cookie != null && this.languages.indexOf(cookie) != -1) {
      this.onLanguageChange(cookie);
    }
  }

  ngOnInit(): void {
  }

  onLanguageChange(language: string) {
    this.selectedLanguage = language;

    setCookie(Secrets.LANGUAGE, language);

    this.translateService.use(language);
  }

}
