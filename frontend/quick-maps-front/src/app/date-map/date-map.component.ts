import { Component, NgZone, OnInit } from '@angular/core';
import { PointType } from '../_entities/point-type';
import { ProgramService } from '../_services/program.service';
import { TourService } from '../_services/tour.service';

// Marker interface, used for presenting the points on the map
interface Marker {
  label: string;
	lat: number;
	lng: number;
  icon_map_key: string;
  show_label: boolean;
}

@Component({
  selector: 'app-date-map',
  templateUrl: './date-map.component.html',
  styleUrls: ['./date-map.component.css']
})
export class DateMapComponent implements OnInit {

  // Default parameters for the map element. Some of these could be dynamic (TODO).
  map_lat : number = 43;
  map_lng : number = 19;
  map_zoom : number = 7;

  map : google.maps.Map|null = null;
  mapClickListener : google.maps.MapsEventListener|null = null;

  selectedDate: Date = new Date();
  allPointTypes: PointType[] = [];
  markers: Marker[] = [];
  markerIconMap: Map<string, any> = new Map();

  constructor(private zone: NgZone, private tourService: TourService, private programService: ProgramService) { }

  ngOnInit(): void {
    this.getAllPointTypes();
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

  onMapClick($event : google.maps.MouseEvent): void {
    // TODO: do we do anything on map click?
    // Get click coordinates
    // let lat = $event.latLng.lat();
    // let lng = $event.latLng.lng();
  }

  goToPreviousDate(): void {
    // TODO
  }

  goToNextDate(): void {
    // TODO
  }

  onDateSelect(dayNumber: number): void {
    // TODO
  }

  getTourInfo(): void {
    this.tourService.getConfirmedTourInfoForDate(this.selectedDate).subscribe(tourInfo => {
      
    });
  }

  getAllPointTypes(): void {
    this.programService.getAllPointTypes().subscribe((types: [PointType]) => {
      this.allPointTypes = types;
      
      // Populate marker icon map for all types
      this.allPointTypes.forEach(type => {
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

}
