import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  constructor(private http: HttpClient) { }

  getAllLocations() {
    // TODO: retrieve all previously created locations from the server
    return this.http.get(uri + "/locations_get");
  }

  updateLocationList() {
    // TODO: update the database with the current location list - remove, update and add so the database reflects the state visible to the user
  }
}
