import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Partner } from '../_entities/partner';
import { PointType } from '../_entities/point-type';
import { TourProgram } from '../_entities/program';
import { ProgramDayPoint } from '../_entities/program-day-point';
import { uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class ProgramService {

  constructor(private http: HttpClient) { }

  getAllPartners() {
    return this.http.get<[Partner]>(uri + '/all_partners');
  }

  getAllTourPrograms() {
    return this.http.get<[TourProgram]>(uri + '/all_tour_programs');
  }

  getAllPointTypes() {
    return this.http.get<[PointType]>(uri + '/all_point_types');
  }

  getTourProgramDays(program_id: number) {
    let data = {
      id: program_id
    };

    return this.http.post<[ProgramDayPoint]>(uri + '/tour_program_days', data);
  }

  addProgramDay(program_id: number, number: number, description: string) {
    let data = {
      id: program_id,
      number: number,
      description: description
    };

    return this.http.post(uri + '/add_program_day', data);
  }

  deleteProgramDay(program_id: number, number: number) {
    let data = {
      id: program_id,
      number: number
    };

    return this.http.post(uri + '/delete_program_day', data);
  }

  addPoint(program_id: number, number: number, point_index: number, use_location: boolean, location: string, lat: number, lng: number, type: string, description: string) {
    let data = {
      id: program_id,
      number: number,
      index: point_index,
      location_present: use_location,
      location: location,
      lat: lat,
      lng: lng,
      type: type,
      description: description
    };

    console.log(use_location);

    return this.http.post(uri + '/add_point', data);
  }

  updatePoint(id: number, point_index: number, location: string, lat: number, lng: number, type: string, description: string) {
    let data = {
      id: id,
      index: point_index,
      location: location,
      lat: lat,
      lng: lng,
      type: type,
      description: description
    };

    return this.http.post(uri + '/update_point', data);
  }

  deletePoint(point_id: number) {
    let data = {
      id: point_id
    };

    return this.http.post(uri + '/delete_point', data);
  }

  fixupTourProgram(program_id: number) {
    let data = {
      id: program_id
    };

    return this.http.post(uri + '/tour_program_fixup', data);
  }
}
