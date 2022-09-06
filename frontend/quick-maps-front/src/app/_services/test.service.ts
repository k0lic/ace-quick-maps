import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { optionsWithCookieEmpty, uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class TestService {

  constructor(private http: HttpClient) { }

  testExcelFileProcessing() {
    return this.http.get(uri + '/test/process_excel_test_file', optionsWithCookieEmpty);
  }

  testDrivingLogProcessing() {
    return this.http.get(uri + '/test/process_driving_log', optionsWithCookieEmpty);
  }

  testDriveFileList() {
    return this.http.get(uri + '/test/list_drive_files', optionsWithCookieEmpty);
  }

  downloadTourSchedule() {
    return this.http.get(uri + '/test/download_tour_schedule', optionsWithCookieEmpty);
  }

  downloadDrivingLog() {
    return this.http.get(uri + '/test/download_driving_log', optionsWithCookieEmpty);
  }
}
