import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class TestService {

  constructor(private http: HttpClient) { }

  testExcelFileProcessing() {
    return this.http.get(uri + '/process_excel_test_file');
  }
}
