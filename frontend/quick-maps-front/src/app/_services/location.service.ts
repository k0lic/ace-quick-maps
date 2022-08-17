import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Location } from '../_entities/location';
import { uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  constructor(private http: HttpClient) { }

  getAllLocations() {
    return this.http.get<[Location]>(uri + "/all_locations");
  }

  addLocation(name: string, lat: number, lng: number) {
    let data = {
      name: name,
      lat: lat,
      lng: lng
    };
    return this.http.post(uri + "/add_location", data);
  }

  moveLocation(name: string, lat: number, lng: number) {
    let data = {
      name: name,
      lat: lat,
      lng: lng
    };
    return this.http.post(uri + "/move_location", data);
  }

  deleteLocation(name: string) {
    let data = {
      name: name
    };
    return this.http.post(uri + "/delete_location", data);
  }
}
