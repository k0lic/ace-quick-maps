import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TourInfoPoint } from '../_entities/tour-info-point';
import { optionsWithCookie, uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class TourService {

  constructor(private http: HttpClient) { }

  getConfirmedTourInfoForDate(date: Date) {
    let data = {
      date: date
    };

    return this.http.post<[TourInfoPoint]>(uri + '/tours/date_tour_info_confirmed', data, optionsWithCookie);
  }
}
