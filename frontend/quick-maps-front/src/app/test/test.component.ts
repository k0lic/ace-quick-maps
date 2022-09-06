import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { setTitle } from '../_helpers/titleHelper';
import { TestService } from '../_services/test.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css']
})
export class TestComponent implements OnInit {

  constructor(
    private titleService: Title,
    private translateService: TranslateService,
    private testService: TestService
  ) { }

  ngOnInit(): void {
    setTitle('SUBTITLES.TEST', this.titleService, this.translateService);
  }

  onTestClick(): void {
    this.testService.testExcelFileProcessing().subscribe(res => {
      // skip
    }, err => {
      console.log(err);
    });
  }

  onDrivingLogClick(): void {
    this.testService.testDrivingLogProcessing().subscribe(res => {
      // skip
      console.log('SUCCESS');
    }, err => {
      console.log(err);
    });
  }

  onDriveListClick(): void {
    this.testService.testDriveFileList().subscribe(res => {
      // skip
      console.log('SUCCESS');
    }, err => {
      console.log(err);
    });
  }

  tourSchedule(): void {
    this.testService.downloadTourSchedule().subscribe(res => {
      // skip
      console.log('SUCCESS');
    }, err => {
      console.log(err);
    });
  }

  drivingLog(): void {
    this.testService.downloadDrivingLog().subscribe(res => {
      // skip
      console.log('SUCCESS');
    }, err => {
      console.log(err);
    });
  }

}
