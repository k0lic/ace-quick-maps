import { Component, NgZone, OnInit } from '@angular/core';
import { Location } from '../_entities/location';
import { Partner } from '../_entities/partner';
import { PointType } from '../_entities/point-type';
import { TourProgram } from '../_entities/program';
import { ProgramDayPoint } from '../_entities/program-day-point';
import { LocationService } from '../_services/location.service';
import { ProgramService } from '../_services/program.service';

// Marker interface, used for presenting the places on the map
interface Marker {
  label: string;
	lat: number;
	lng: number;
  icon_map_key: string;
  show_label: boolean;
}

// Point interface, used for the sidebar
interface ProgramPoint {
  id: number;
  index: number;
  location: string;
  type: string;
  description: string;
  lat: number;
  lng: number;
}

// Program Day interface, used for the sidebar
interface ProgramDay {
  program_id: number;
  day_number: number;
  description: string;
  points: ProgramPoint[];
}

@Component({
  selector: 'app-program-editor',
  templateUrl: './program-editor.component.html',
  styleUrls: ['./program-editor.component.css']
})
export class ProgramEditorComponent implements OnInit {

  // Default parameters for the map element. Some of these could be dynamic (TODO).
  map_lat : number = 43;
  map_lng : number = 19;
  map_zoom : number = 7;

  map : google.maps.Map|null = null;
  mapClickListener : google.maps.MapsEventListener|null = null;

  partners: Partner[] = [];
  tourPrograms: TourProgram[] = [];
  tourProgramsFiltered: TourProgram[] = [];
  pointTypes: PointType[] = [];
  dayPointsRaw: ProgramDayPoint[] = [];
  days: ProgramDay[] = [];
  locations: Location[] = [];
  locationMarkers: Marker[] = [];
  pointMarkers: Marker[] = [];
  markerIconMap: Map<string, any> = new Map();

  editMode: boolean = false;
  selectedDay: number = 1;
  selectedPartnerId: number = -1;
  selectedPartnerName: string = "";
  selectedTourProgramId: number = 1;
  selectedTourProgramName: string = "";
  selectedPointType: string = "";

  jokerPartner: Partner = {
    idpartner: -1,
    name: "Any partner",
    shorthand: "Any"
  };

  constructor(private zone: NgZone, private locationService: LocationService, private programService: ProgramService) { }

  ngOnInit(): void {
    this.getAllPartners();
    this.getAllPrograms();
    this.getAllPointTypes();
    this.getAllLocations();
  }

  // Workaround necessary since the default way is broken in this version of the agm(?) library.
  // If this is removed, variables: map, mapClickListener, zone; become useless -> remove as well.
  ngOnDestroy(): void {
    if (this.mapClickListener) {
      this.mapClickListener.remove();
    }
  }
  
  mapReadyHandler($event : google.maps.Map): void {
    this.map = $event;
    this.mapClickListener = this.map.addListener('click', (e: google.maps.MouseEvent) => {
      this.zone.run(() => {
        this.onMapClick(e);
      });
    });
  }
  // End of workaround.

  // React to user action
  onMapClick($event : google.maps.MouseEvent): void {
    // Ignore if not in edit mode
    if (!this.editMode) {
      return;
    }

    // Get click coordinates
    let lat = $event.latLng.lat();
    let lng = $event.latLng.lng();

    // TODO: check if marker is free floating - if so we don't search for the nearest location
    let loc = this.getNearestLocation(lat, lng);

    // Add marker
    this.pointMarkers.push({
      label: loc.name,
      lat: loc.lat,
      lng: loc.lng,
      icon_map_key: this.selectedPointType,
      show_label: this.getSelectedPointType()?.preferred_ui_label??false
    });
    console.log(this.pointMarkers);

    // Add point to day
    let dayIndex = this.selectedDay - 1;
    this.days[dayIndex].points.push({
      id: 0,
      index: this.days[dayIndex].points.length + 1,
      location: loc.name,
      type: this.selectedPointType,
      description: '',
      lat: loc.lat,
      lng: loc.lng
    });
  }

  flipEditMode(): void {
    this.editMode = !this.editMode;
  }

  goToPreviousDay(): void {
    this.onDaySelect(this.selectedDay - 1);
  }

  goToNextDay(): void {
    this.onDaySelect(this.selectedDay + 1);
  }

  onPartnerSelect(partnerId: number): void {
    this.selectedPartnerId = partnerId;

    // Special value for any partner
    if (partnerId == this.jokerPartner.idpartner) {
      this.tourProgramsFiltered = this.tourPrograms;
    } else {
      // Filter for only programs of selected partner
      this.tourProgramsFiltered = this.tourPrograms.filter((prog) => {
        return prog.partner_id == this.selectedPartnerId;
      });
    }

    // Automatically select the first program from the list
    this.onTourProgramSelect(this.tourProgramsFiltered[0].id);
  }

  onTourProgramSelect(id: number): void {
    this.selectedTourProgramId = id;

    this.tourPrograms.forEach(prog => {
      if (prog.id == id) {
        this.selectedPartnerName = prog.partner_name;
        this.selectedTourProgramName = prog.name;
      }
    });

    // Fetch all the day-points from the server for the selected program
    this.getAllDayPoints();
  }

  onDaySelect(dayNumber: number): void {
    // TODO: check ranges

    this.selectedDay = dayNumber;

    // TODO: do something with the map
  }

  addTourProgramDay(): void {
    // Start indexing from 1
    let newDayNumber = 1 + this.days.length;

    // TODO: day description?
    this.programService.addProgramDay(this.selectedTourProgramId, newDayNumber, "").subscribe(res => {
      // TODO: react to newly added day
      console.log('res');
      console.log(res);
    }, err => {
      console.log('err');
      console.log(err);

      // TODO: figure out how to not flow into the error catcher
      this.getAllDayPoints();
    });
  }

  onPointTypeClick(name: string): void {
    this.selectedPointType = name;
  }

  // Fetch data from server
  getAllPartners(): void {
    this.programService.getAllPartners().subscribe((partners: [Partner]) => {
      let partnersWithJoker = [this.jokerPartner].concat(partners);
      this.partners = partnersWithJoker;
    });
  }

  getAllPrograms(): void {
    this.programService.getAllTourPrograms().subscribe((programs: [TourProgram]) => {
      this.tourPrograms = programs;
      this.onPartnerSelect(this.jokerPartner.idpartner);
    });
  }

  getAllPointTypes(): void {
    this.programService.getAllPointTypes().subscribe((types: [PointType]) => {
      this.pointTypes = types.sort((t1, t2) => t1.preferred_ui_pos - t2.preferred_ui_pos);

      // Set first type as selected by default
      this.selectedPointType = this.pointTypes[0].name;

      // Populate marker icon map for all types
      this.pointTypes.forEach(type => {
        if (type.preferred_ui_icon == null || type.preferred_ui_icon.trim().length == 0) {
          // There is no icon
          this.markerIconMap.set(type.name, ' ');
        } else {
          // There should be an icon
          this.markerIconMap.set(type.name, {
            url: (type.preferred_ui_icon != null && type.preferred_ui_icon != '')?(')../../assets/icons/' + type.preferred_ui_icon):'',
            labelOrigin: {x: 18, y: -6}
          });
        }
      });
    });
  }

  getAllDayPoints(): void {
    this.programService.getTourProgramDays(this.selectedTourProgramId).subscribe((dayPoints: [ProgramDayPoint]) => {
      this.dayPointsRaw = dayPoints;

      // Structure the data into array of days, each containing an array of points
      // Count days
      let numberOfDays = 0;
      this.dayPointsRaw.forEach(dp => {
        if (dp.day_number > numberOfDays) {
          numberOfDays = dp.day_number;
        }
      });

      // Initiate with nulls
      let tmp: ProgramDay[] = new Array(numberOfDays).fill(null);

      // Iterate through every element and gather data
      this.dayPointsRaw.forEach(dp => {
        // day_number is indexed from 1
        let dayIndex = dp.day_number - 1;

        // Check if day needs to be initiated
        if (tmp[dayIndex] == null) {
          tmp[dayIndex] = {
            program_id: dp.program_id,
            day_number: dp.day_number,
            description: dp.day_description,
            points: []
          };
        }

        // Check if there's a point to add
        if (dp.point_id != null) {
          tmp[dayIndex].points.push({
            id: dp.point_id,
            index: dp.point_index,
            location: dp.location_name,
            type: dp.point_type,
            description: dp.point_description,
            lat: dp.location_name != null?dp.location_lat:dp.ff_lat,
            lng: dp.location_name != null?dp.location_lng:dp.ff_lng
          });
        }
      });

      // Save
      this.days = tmp;
    });
  }

  getAllLocations(): void {
    this.locationService.getAllLocations().subscribe((locations: [Location]) => {
      this.locations = locations;

      // Add location icon object to marker icon map
      this.markerIconMap.set('_location', {
        url: '../../assets/icons/place_gray.svg',
        labelOrigin: {x: 18, y: -6}
      });

      // Add location markers to map
      this.locationMarkers = [];
      this.locations.forEach(loc => {
        this.locationMarkers.push({
          label: loc.name,
          lat: loc.lat,
          lng: loc.lng,
          icon_map_key: '_location',
          show_label: true
        });
      });
    });
  }

  // OTHER
  getNearestLocation(lat: number, lng: number): Location {
    let best_loc = this.locations[0];
    let dist_sqr = this.distance(best_loc.lat, best_loc.lng, lat, lng);

    this.locations.forEach(loc => {
      let tmp_dist = this.distance(loc.lat, loc.lng, lat, lng);
      if (tmp_dist < dist_sqr) {
        best_loc = loc;
        dist_sqr = tmp_dist;
      }
    });

    return best_loc;
  }

  // Does NOT work for all spots on the globe, will work for our use case ;)
  distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2);
  }

  getSelectedPointType(): PointType | undefined {
    return this.pointTypes.find(t => t.name == this.selectedPointType);
  }

}
