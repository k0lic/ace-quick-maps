import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Partner } from '../_entities/partner';
import { PointType } from '../_entities/point-type';
import { TourProgram } from '../_entities/program';
import { ProgramDayPoint } from '../_entities/program-day-point';
import { optionsWithCookie, optionsWithCookieEmpty, uri } from '../_helpers/uriHelper';

@Injectable({
  providedIn: 'root'
})
export class ProgramService {

  constructor(private http: HttpClient) { }

  getAllPartners() {
    return this.http.get<[Partner]>(uri + '/programs/all_partners', optionsWithCookie);
  }

  getAllTourPrograms() {
    return this.http.get<[TourProgram]>(uri + '/programs/all_tour_programs', optionsWithCookie);
  }

  getAllPointTypes() {
    return this.http.get<[PointType]>(uri + '/point-types/all_point_types', optionsWithCookie);
  }

  getTourProgramDays(program_id: number) {
    let data = {
      id: program_id
    };

    return this.http.post<[ProgramDayPoint]>(uri + '/programs/tour_program_days', data, optionsWithCookie);
  }

  addProgramDay(program_id: number, number: number, description: string) {
    let data = {
      id: program_id,
      number: number,
      description: description
    };

    return this.http.post(uri + '/programs/add_program_day', data, optionsWithCookieEmpty);
  }

  deleteProgramDay(program_id: number, number: number) {
    let data = {
      id: program_id,
      number: number
    };

    return this.http.post(uri + '/programs/delete_program_day', data, optionsWithCookieEmpty);
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

    return this.http.post(uri + '/programs/add_point', data, optionsWithCookieEmpty);
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

    return this.http.post(uri + '/programs/update_point', data, optionsWithCookieEmpty);
  }

  deletePoint(point_id: number) {
    let data = {
      id: point_id
    };

    return this.http.post(uri + '/programs/delete_point', data, optionsWithCookieEmpty);
  }

  fixupTourProgram(program_id: number) {
    let data = {
      id: program_id
    };

    return this.http.post(uri + '/programs/tour_program_fixup', data, optionsWithCookieEmpty);
  }
}
