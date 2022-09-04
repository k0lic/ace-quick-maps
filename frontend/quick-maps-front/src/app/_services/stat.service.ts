import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaxNightsByLocation } from '../_entities/pax-nights-by-location';
import { optionsWithCookie, uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class StatService {

  constructor(private http: HttpClient) { }

  getPaxNightsByLocation() {
    return this.http.get<PaxNightsByLocation[]>(uri + '/stats/pax_nights_by_location', optionsWithCookie);
  }
}
