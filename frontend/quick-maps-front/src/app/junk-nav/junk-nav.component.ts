import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { setTitle } from '../_helpers/titleHelper';

@Component({
  selector: 'app-junk-nav',
  templateUrl: './junk-nav.component.html',
  styleUrls: ['./junk-nav.component.css']
})
export class JunkNavComponent implements OnInit {

  constructor(
    private titleService: Title,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    setTitle('SUBTITLES.NAV', this.titleService, this.translateService);
  }

}
