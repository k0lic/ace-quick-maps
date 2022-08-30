import { Component, OnInit } from '@angular/core';
import { TestService } from '../_services/test.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css']
})
export class TestComponent implements OnInit {

  constructor(private testService: TestService) { }

  ngOnInit(): void {
  }

  onTestClick(): void {
    this.testService.testExcelFileProcessing().subscribe(res => {
      // skip
    }, err => {
      console.log(err);
    });
  }

}
