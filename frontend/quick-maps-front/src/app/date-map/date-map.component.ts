import { Component, NgZone, OnInit } from '@angular/core';
import { PointType } from '../_entities/point-type';
import { TourInfoPoint } from '../_entities/tour-info-point';
import { ProgramService } from '../_services/program.service';
import { TourService } from '../_services/tour.service';

// Marker interface, used for presenting the points on the map
interface Marker {
  tourName: string;
  tourStartDate: Date;
  label: string;
	lat: number;
	lng: number;
  iconMapKey: string;
  showLabel: boolean;
}

interface MarkerContainer {
  name: string;
  depart: number;
  excelRow: number;
  status: string;
  startDate: Date;
  endDate: Date;
  date: Date;
  hotel1: string;
  hotel2: string;
  tourGuide: string;
  guests: string;
  activities: string;
  markers: Marker[];
  color: string;
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
  tourInfoPoints: TourInfoPoint[] = [];
  tourInfoBank: Map<string, TourInfoPoint[]> = new Map();
  markerContainers: MarkerContainer[] = [];
  markerIconMap: Map<string, any> = new Map();

  constructor(private zone: NgZone, private tourService: TourService, private programService: ProgramService) { }

  ngOnInit(): void {
    this.getAllPointTypes();
    this.getTourInfo();
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
    let newDate = new Date(this.selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    this.onDateSelect(newDate);
  }

  goToNextDate(): void {
    let newDate = new Date(this.selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    this.onDateSelect(newDate);
  }

  onDateSelect(newDate: Date): void {
    this.selectedDate = newDate;

    // Request tour info for the new date
    this.getTourInfo();
  }

  getTourInfo(): void {
    // Check if this date was already queried
    if (this.tourInfoBank.has(this.dateString(this.selectedDate))) {
      console.log('JUST LOOK IN THE BANK PogO');
      this.tourInfoPoints = this.tourInfoBank.get(this.dateString(this.selectedDate))??[];
      this.refreshMarkerContainers();
      return;
    }

    // This is the first time this date is requested, so send the query to the server
    this.tourService.getConfirmedTourInfoForDate(this.selectedDate).subscribe((tourInfo: [TourInfoPoint]) => {
      console.log('QUERY THE SERVER Sadge');
      this.tourInfoPoints = tourInfo;
      
      // Save date info for possible later use
      // TODO: can this cause too much memory usage?
      if (this.tourInfoPoints.length > 0) {
        this.tourInfoBank.set(this.dateString(this.tourInfoPoints[0].date), this.tourInfoPoints);
        console.log(this.tourInfoBank.keys());
      }

      this.refreshMarkerContainers();
    });
  }

  refreshMarkerContainers(): void {
    this.markerContainers = [];
    this.tourInfoPoints.forEach(p => {
      let c: MarkerContainer | undefined = this.markerContainers.find(mc => mc.name == p.program && mc.startDate == p.start_date);
      if (c == null) {
        c = {
          name: p.program,
          depart: p.depart,
          excelRow: p.excel_row,
          status: p.status,
          startDate: p.start_date,
          endDate: p.end_date,
          date: p.date,
          hotel1: p.hotel1,
          hotel2: p.hotel2,
          tourGuide: p.tour_guide,
          guests: p.guests,
          activities: p.activities,
          markers: [],
          color: '#FF0000'
        };
        this.markerContainers.push(c);
      }

      c.markers.push({
        tourName: p.program,
        tourStartDate: p.start_date,
        label: p.location,
        lat: p.location != null ? p.lat : p.ff_lat,
        lng: p.location != null ? p.lng: p.ff_lng,
        iconMapKey: p.point_type,
        showLabel: this.allPointTypes.find(t => t.name == p.point_type)?.preferred_ui_label??false
      });
    });

    console.log(this.markerContainers);
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

  padZero(x: number): string {
    return (x >= 0 && x < 10 ? '0' : '') + x;
  }

  dateString(d: Date): string {
    d = new Date(d);
    return this.padZero(d.getDate()) + '/' + this.padZero(d.getMonth() + 1) + '/' + d.getFullYear();
  }

}