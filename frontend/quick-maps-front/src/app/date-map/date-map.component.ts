import { Component, NgZone, OnInit, Renderer2, SecurityContext } from '@angular/core';
import { TranslateCompiler, TranslateService } from '@ngx-translate/core';
import { PointType } from '../_entities/point-type';
import { TourInfoPoint } from '../_entities/tour-info-point';
import { escapeHtml } from '../_helpers/stringHelper';
import { defaultSvgPath, svgMap } from '../_helpers/svgHelper';
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

interface TourInfoOverlay extends google.maps.OverlayView {
  position: google.maps.LatLng;
  containerDiv: HTMLDivElement;
  bubbleContainer: HTMLDivElement;
  bubbleContainerBig: HTMLDivElement;
  hideBigOne: boolean;

  addItem(item: MarkerContainer): void;
  toggle(): void;
}

let TourInfoWindow: { new (position: google.maps.LatLng, content: string, color: string): TourInfoOverlay};
let needToDefine = true;
let renderer: Renderer2;
let translateService: TranslateService;

function maybeDefine() {
  if (needToDefine) {
    defineTourInfoWindow();
    needToDefine = false;
  }
}

function padZero(x: number): string {
  return (x >= 0 && x < 10 ? '0' : '') + x;
}

function dateString(d: Date): string {
  d = new Date(d);
  return padZero(d.getDate()) + '/' + padZero(d.getMonth() + 1) + '/' + d.getFullYear();
}

function toggleTOurInfoOverlay(tio: TourInfoOverlay): void {
  tio.toggle();
}

function defineTourInfoWindow() {
  TourInfoWindow = class TourInfoWindow extends google.maps.OverlayView implements TourInfoOverlay {
    position: google.maps.LatLng;
    containerDiv: HTMLDivElement;
    bubbleContainer: HTMLDivElement;
    bubbleContainerBig: HTMLDivElement;
    hideBigOne: boolean;
  
    constructor(position: google.maps.LatLng, content: string, color: string) {
      super();
  
      this.position = position;

      // Item containers - each holds the separate div elements representing tours and stuff - first one the short version, the second one the long one
      this.bubbleContainer = renderer.createElement('div');
      this.bubbleContainerBig = renderer.createElement('div');

      // Hide big one
      renderer.setStyle(this.bubbleContainerBig, 'display', 'none');
      this.hideBigOne = true;
      
      // Container for the afformentioned containers :)
      let conContainer = renderer.createElement('div');
      renderer.addClass(this.bubbleContainer, 'bubble-popup');
      renderer.appendChild(conContainer, this.bubbleContainer);
      renderer.appendChild(conContainer, this.bubbleContainerBig);
      renderer.listen(conContainer, 'click', event => {
        toggleTOurInfoOverlay(this);
      });

      // I need the anchor - holds the item container
      let bubbleAnchor = renderer.createElement('div');
      renderer.addClass(bubbleAnchor, 'popup-bubble-anchor');
      renderer.appendChild(bubbleAnchor, conContainer);
  
      // The container adjusts the position based on the map zoom/pan - holds the anchor
      this.containerDiv = renderer.createElement('div');
      renderer.addClass(this.containerDiv, 'tour-info-container');
      renderer.appendChild(this.containerDiv, bubbleAnchor);
  
      TourInfoWindow.preventMapHitsAndGesturesFrom(this.containerDiv);
    }

    addItem(item: MarkerContainer) {
      // TODO: maybe this should be a component?
      // Add short version
      let bubble = renderer.createElement('div');
      renderer.addClass(bubble, 'popup-inner');
      renderer.setStyle(bubble, 'border', '2px solid ' + item.color);
      renderer.setProperty(bubble, 'innerHTML', escapeHtml(item.name));

      renderer.appendChild(this.bubbleContainer, bubble);

      // Add detailed version
      let bubbleBig = renderer.createElement('div');
      renderer.addClass(bubbleBig, 'popup-inner');
      renderer.setStyle(bubbleBig, 'border', '2px solid ' + item.color);

      let headerEl = renderer.createElement('h4');
      renderer.setProperty(headerEl, 'innerHTML', escapeHtml(item.name + ' ' + dateString(item.startDate)));
      renderer.appendChild(bubbleBig, headerEl);
      
      let guideEl = renderer.createElement('div');
      renderer.setProperty(
        guideEl, 'innerHTML', escapeHtml(translateService.instant('ITEMS.TOUR_GUIDE', {value: item.tourGuide ?? '/'})));
      renderer.appendChild(bubbleBig, guideEl);
      
      let guestsEl = renderer.createElement('div');
      renderer.setProperty(
        guestsEl, 'innerHTML', escapeHtml(translateService.instant('ITEMS.GUESTS', {value: item.guests ?? '/'})));
      renderer.appendChild(bubbleBig, guestsEl);
      
      let hotel1El = renderer.createElement('div');
      renderer.setProperty(
        hotel1El, 'innerHTML', escapeHtml(translateService.instant('ITEMS.HOTEL1', {value: item.hotel1 ?? '/'})));
      renderer.appendChild(bubbleBig, hotel1El);
      
      let hotel2El = renderer.createElement('div');
      renderer.setProperty(
        hotel2El, 'innerHTML', escapeHtml(translateService.instant('ITEMS.HOTEL2', {value: item.hotel2 ?? '/'})));
      renderer.appendChild(bubbleBig, hotel2El);
      
      let routeEl = renderer.createElement('div');
      renderer.setProperty(
        routeEl, 'innerHTML', escapeHtml(translateService.instant('ITEMS.ROUTE', {
            v1: item.markers[0].label != null ? translateService.instant('LOC.' + item.markers[0].label) : '?',
            v2: item.markers[item.markers.length - 1].label != null ? translateService.instant('LOC.' + item.markers[item.markers.length - 1].label) : '?' 
          })));
      renderer.appendChild(bubbleBig, routeEl);
      
      if (item.activities != null) {
        let activitiesEl = renderer.createElement('div');
        renderer.setProperty(
          activitiesEl, 'innerHTML', escapeHtml(translateService.instant('ITEMS.ACTIVITY', {value: item.activities})));
        renderer.appendChild(bubbleBig, activitiesEl);
      }

      renderer.appendChild(this.bubbleContainerBig, bubbleBig);
    }

    toggle() {
      this.hideBigOne = !this.hideBigOne;
      if (this.hideBigOne) {
        renderer.setStyle(this.bubbleContainer, 'display', 'block');
        renderer.setStyle(this.bubbleContainerBig, 'display', 'none');
      } else {
        renderer.setStyle(this.bubbleContainer, 'display', 'none');
        renderer.setStyle(this.bubbleContainerBig, 'display', 'block');
      }
    }
  
    onAdd() {
      renderer.appendChild(this.getPanes()!.floatPane, this.containerDiv);
    }
  
    onRemove() {
      if (this.containerDiv.parentElement) {
        renderer.removeChild(this.containerDiv.parentElement, this.containerDiv);
      }
    }
  
    draw() {
      let divPosition = this.getProjection().fromLatLngToDivPixel(this.position)!;
  
      renderer.setStyle(this.containerDiv, 'left', divPosition.x + 'px');
      renderer.setStyle(this.containerDiv, 'top', divPosition.y + 'px');
      renderer.setStyle(this.containerDiv, 'display', 'block');
    }
  }
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

  anchorConst: any;
  labelOriginConst: any;

  map : google.maps.Map|null = null;
  mapClickListener : google.maps.MapsEventListener|null = null;

  svgMap: Map<string, string> = svgMap;
  defaultSvgPath: string = defaultSvgPath;

  selectedDate: Date = new Date();
  allPointTypes: PointType[] = [];
  tourInfoPoints: TourInfoPoint[] = [];
  tourInfoBank: Map<string, TourInfoPoint[]> = new Map();
  markerContainers: MarkerContainer[] = [];
  markerIconMap: Map<string, any> = new Map();
  shortInfoWindows: TourInfoOverlay[] = [];

  constructor(
    private zone: NgZone, 
    private renderer: Renderer2, 
    private translateService: TranslateService,
    private tourService: TourService, 
    private programService: ProgramService
  ) { }

  ngOnInit(): void {
    this.getAllPointTypes();
    this.getTourInfo();

    this.anchorConst = {x: 12, y: 12};
    this.labelOriginConst = {x: 12, y: 12};

    renderer = this.renderer;
    translateService = this.translateService;
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
      this.tourInfoPoints = this.tourInfoBank.get(this.dateString(this.selectedDate))??[];
      this.refreshMarkerContainers();
      return;
    }

    // This is the first time this date is requested, so send the query to the server
    this.tourService.getConfirmedTourInfoForDate(this.selectedDate).subscribe((tourInfo: [TourInfoPoint]) => {
      this.tourInfoPoints = tourInfo;
      
      // Save date info for possible later use
      // TODO: can this cause too much memory usage?
      if (this.tourInfoPoints.length > 0) {
        this.tourInfoBank.set(this.dateString(this.tourInfoPoints[0].date), this.tourInfoPoints);
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
          color: p.color
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

    this.refreshInfoWindows();
  }

  refreshInfoWindows(): void {
    // Check if google is defined, if not wait a bit then try again
    if (typeof google === 'undefined') {
      setTimeout(() => this.refreshInfoWindows(), 10);
      return;
    }

    // Define the google.maps.OverlayView extended class, has to be defined dynamically since this page loads before google loads via script 
    maybeDefine();

    // Remove old windows
    this.shortInfoWindows.forEach(s => {
      s.setMap(null);
    });

    // Create new windows
    this.shortInfoWindows = [];
    this.markerContainers.forEach(c => {
      let lat = c.markers[0].lat;
      let lng = c.markers[0].lng;

      // If there's a polyline(s), put the window in the middle of the first polyline
      if (c.markers.length > 1) {
        lat = (lat + c.markers[1].lat) / 2;
        lng = (lng + c.markers[1].lng) / 2;
      }

      // Check if there's already a popup at the coordinates, if so don't create a new popup but instead add tour info to existing popup
      let w: TourInfoOverlay | undefined = this.shortInfoWindows.find(w => w.position.lat() == lat && w.position.lng() == lng);
      if (w == null) {
        // Create new popup - empty
        w = new TourInfoWindow(
          new google.maps.LatLng(lat, lng),
          c.name,
          c.color
        );
        w.setMap(this.map);

        this.shortInfoWindows.push(w);
      }

      // Add item to popup
      // w.addItem(c.name, c.color);
      // w.addItemBig(c.name + (c.tourGuide != null ? ' - ' + c.tourGuide : ''), c.color);
      w.addItem(c);
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
          this.markerIconMap.set(
            type.name, 
            type.preferred_ui_icon ?? ''
          );
        }
      });
    });
  }

  getSvgPath(key: string): string {
    let iconName = this.markerIconMap.get(key);
    return svgMap.get(iconName)??defaultSvgPath;
  }

  dateString(d: Date): string {
    return dateString(d);
  }

}