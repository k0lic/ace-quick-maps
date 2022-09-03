import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Secrets } from 'secrets';
import { getCookie } from './_helpers/cookieHelper';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'quick-maps-front';

  languages: string[] = [
    'sr-Latn',
    'sr-Cyrl',
    'en'
  ];

  constructor(public translate: TranslateService) {
    // this language will be used as a fallback when a translation isn't found in the current language
    translate.setDefaultLang('sr-Latn');

    // the lang to use, if the lang isn't available, it will use the current loader to get them
    let cookie = getCookie(Secrets.LANGUAGE);
    if (cookie != null && this.languages.indexOf(cookie) != -1) {
      translate.use(cookie);
    }
  }
}