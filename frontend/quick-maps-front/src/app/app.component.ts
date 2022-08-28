import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'quick-maps-front';

  constructor(public translate: TranslateService) {
    // this language will be used as a fallback when a translation isn't found in the current language
    translate.setDefaultLang('sr-Latn');

    // the lang to use, if the lang isn't available, it will use the current loader to get them
    // TODO: check cookies
    translate.use('sr-Latn');
  }
}