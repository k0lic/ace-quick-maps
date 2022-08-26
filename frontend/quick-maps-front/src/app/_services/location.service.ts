import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Location } from '../_entities/location';
import { optionsWithCookie, optionsWithCookieEmpty, uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  constructor(private http: HttpClient) { }

  getAllLocations() {
    return this.http.get<[Location]>(uri + "/locations/all_locations", optionsWithCookie);
  }

  addLocation(name: string, lat: number, lng: number) {
    let data = {
      name: name,
      lat: lat,
      lng: lng
    };
    return this.http.post(uri + "/locations/add_location", data, optionsWithCookieEmpty);
  }

  moveLocation(name: string, lat: number, lng: number) {
    let data = {
      name: name,
      lat: lat,
      lng: lng
    };
    return this.http.post(uri + "/locations/move_location", data, optionsWithCookieEmpty);
  }

  deleteLocation(name: string) {
    let data = {
      name: name
    };
    return this.http.post(uri + "/locations/delete_location", data, optionsWithCookieEmpty);
  }
}
