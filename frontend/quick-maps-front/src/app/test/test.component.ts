import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LoggedInComponent } from '../_abstracts/logged-in.component';
import { setTitle } from '../_helpers/titleHelper';
import { MeService } from '../_services/me.service';
import { TestService } from '../_services/test.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css']
})
export class TestComponent extends LoggedInComponent implements OnInit {

  constructor(
    protected router: Router,
    protected meService: MeService,
    private titleService: Title,
    private translateService: TranslateService,
    private testService: TestService
  ) {
    super(router, meService);
  }

  ngOnInit(): void {
    setTitle('SUBTITLES.TEST', this.titleService, this.translateService);
  }

  onTestClick(): void {
    this.testService.testExcelFileProcessing().subscribe(res => {
      // skip
    }, err => this.checkErrUnauthorized(err));
  }

  onDrivingLogClick(): void {
    this.testService.testDrivingLogProcessing().subscribe(res => {
      // skip
      console.log('SUCCESS');
    }, err => this.checkErrUnauthorized(err));
  }

  onDriveListClick(): void {
    this.testService.testDriveFileList().subscribe(res => {
      // skip
      console.log('SUCCESS');
    }, err => this.checkErrUnauthorized(err));
  }

  tourSchedule(): void {
    this.testService.downloadTourSchedule().subscribe(res => {
      // skip
      console.log('SUCCESS');
    }, err => this.checkErrUnauthorized(err));
  }

  drivingLog(): void {
    this.testService.downloadDrivingLog().subscribe(res => {
      // skip
      console.log('SUCCESS');
    }, err => this.checkErrUnauthorized(err));
  }

}
