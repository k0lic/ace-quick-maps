import { Component, NgZone, OnInit, Renderer2, SecurityContext } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslateCompiler, TranslateService } from '@ngx-translate/core';
import { LoggedInComponent } from '../_abstracts/logged-in.component';
import { PointType } from '../_entities/point-type';
import { TourInfoPoint } from '../_entities/tour-info-point';
import { escapeHtml } from '../_helpers/stringHelper';
import { defaultSvgPath, svgMap } from '../_helpers/svgHelper';
import { setTitle } from '../_helpers/titleHelper';
import { MeService } from '../_services/me.service';
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
  tourGuides: string | null;
  guests: string;
  rooms: string | null;
  activities: string;
  vehicles: string | null;
  carriers: string | null;
  drivingLogNotice: string;
  markers: Marker[];
  color: string;
  opacity: number;
}

interface TourInfoOverlay extends google.maps.OverlayView {
  position: google.maps.LatLng;
  containerDiv: HTMLDivElement;
  bubbleContainer: HTMLDivElement;
  bubbleContainerBig: HTMLDivElement;
  hideBigOne: boolean;

  addItem(item: MarkerContainer, showFields: any): void;
  toggle(): void;
  popToFront(): void;
}

let TourInfoWindow: { new(position: google.maps.LatLng, content: string, color: string): TourInfoOverlay };
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

function pad4Zero(x: number): string {
  let prefix = x < 10 ? '000'
    : x < 100 ? '00'
      : x < 1000 ? '0'
        : '';
  return prefix + x;
}

function dateString(d: Date): string {
  d = new Date(d);
  return padZero(d.getDate()) + '/' + padZero(d.getMonth() + 1) + '/' + d.getFullYear();
}

function dateStringDashed(d: Date): string {
  d = new Date(d);
  return pad4Zero(d.getFullYear()) + '-' + padZero(d.getMonth() + 1) + '-' + padZero(d.getDate());
}

function toggleTourInfoOverlay(tio: TourInfoOverlay): void {
  tio.toggle();
  tio.popToFront();
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
      renderer.addClass(this.bubbleContainer, 'popup-bubble');
      renderer.listen(this.bubbleContainer, 'click', event => {
        toggleTourInfoOverlay(this);
      });

      this.bubbleContainerBig = renderer.createElement('div');
      renderer.addClass(this.bubbleContainerBig, 'popup-bubble');
      renderer.listen(this.bubbleContainerBig, 'click', event => {
        toggleTourInfoOverlay(this);
      });

      // Hide big one
      renderer.setStyle(this.bubbleContainerBig, 'display', 'none');
      this.hideBigOne = true;

      // Container for the afformentioned containers :)
      let conContainer = renderer.createElement('div');
      renderer.addClass(conContainer, 'popup-bounds');
      renderer.appendChild(conContainer, this.bubbleContainer);
      renderer.appendChild(conContainer, this.bubbleContainerBig);

      // I need the anchor - holds the item container
      let bubbleAnchor = renderer.createElement('div');
      renderer.addClass(bubbleAnchor, 'popup-bubble-anchor');
      renderer.appendChild(bubbleAnchor, conContainer);

      // The container adjusts the position based on the map zoom/pan - holds the anchor
      this.containerDiv = renderer.createElement('div');
      renderer.addClass(this.containerDiv, 'tour-info-container');
      renderer.appendChild(this.containerDiv, bubbleAnchor);

      TourInfoWindow.preventMapHitsAndGesturesFrom(this.bubbleContainer);
      TourInfoWindow.preventMapHitsAndGesturesFrom(this.bubbleContainerBig);
    }

    addItem(item: MarkerContainer, showFields: any) {
      // TODO: maybe this should be a component? I tried making it into a component, was very difficult so I gave up, the changes are stashed somewhere
      // Add short version
      let bubble = renderer.createElement('div');
      renderer.addClass(bubble, 'popup-inner');
      if (item.status == 'confirmed') {
        renderer.setStyle(bubble, 'border', '2px solid ' + item.color);
      } else {
        renderer.setStyle(bubble, 'border', '2px dotted ' + item.color);
      }

      let shortContent = '';
      shortContent += showFields.name && item.name ? (shortContent.length > 0 ? ',' : '') + item.name : '';
      shortContent += showFields.startDate && item.startDate ? (shortContent.length > 0 ? ',' : '') + dateString(item.startDate) : '';
      shortContent += showFields.tourGuides && item.tourGuides ? (shortContent.length > 0 ? ',' : '') + item.tourGuides : '';
      shortContent += showFields.guests && item.guests ? (shortContent.length > 0 ? ',' : '') + item.guests : '';
      shortContent += showFields.hotel1 && item.hotel1 ? (shortContent.length > 0 ? ',' : '') + item.hotel1 : '';
      shortContent += showFields.hotel2 && item.hotel2 ? (shortContent.length > 0 ? ',' : '') + item.hotel2 : '';
      shortContent += showFields.activities && item.activities ? (shortContent.length > 0 ? ',' : '') + item.activities : '';
      shortContent += showFields.rooms && item.rooms ? (shortContent.length > 0 ? ',' : '') + item.rooms : '';
      shortContent += showFields.vehicles && item.vehicles ? (shortContent.length > 0 ? ',' : '') + item.vehicles : '';
      shortContent += showFields.carriers && item.carriers ? (shortContent.length > 0 ? ',' : '') + item.carriers : '';
      renderer.setProperty(bubble, 'innerHTML', escapeHtml(shortContent));

      renderer.appendChild(this.bubbleContainer, bubble);

      // Add detailed version
      let bubbleBig = renderer.createElement('div');
      renderer.addClass(bubbleBig, 'popup-inner');
      if (item.status == 'confirmed') {
        renderer.setStyle(bubbleBig, 'border', '2px solid ' + item.color);
      } else {
        renderer.setStyle(bubbleBig, 'border', '2px dotted ' + item.color);
      }

      //    Heading
      let headerEl = renderer.createElement('h4');
      renderer.addClass(headerEl, 'popup-header');
      renderer.setProperty(headerEl, 'innerHTML', escapeHtml(item.name + ' ' + dateString(item.startDate)));
      renderer.appendChild(bubbleBig, headerEl);

      //    Mandatory rows
      this.addTableRow(bubbleBig, 'ITEM_LABELS.TOUR_GUIDE', item.tourGuides ?? '/');
      this.addTableRow(bubbleBig, 'ITEM_LABELS.GUESTS', item.guests ?? '/');
      this.addTableRow(bubbleBig, 'ITEM_LABELS.HOTEL1', item.hotel1 ?? '/');
      this.addTableRow(bubbleBig, 'ITEM_LABELS.HOTEL2', item.hotel2 ?? '/');
      this.addTableRow(bubbleBig, 'ITEM_LABELS.ROUTE', translateService.instant('ITEM_VALUE_PATTERNS.ROUTE', {
        v1: item.markers[0].label != null ? translateService.instant('LOC.' + item.markers[0].label) : '?',
        v2: item.markers[item.markers.length - 1].label != null ? translateService.instant('LOC.' + item.markers[item.markers.length - 1].label) : '?'
      }));

      //    Optional rows
      if (item.activities != null) {
        this.addTableRow(bubbleBig, 'ITEM_LABELS.ACTIVITY', item.activities);
      }
      if (item.rooms != null && item.rooms != '') {
        this.addTableRow(bubbleBig, 'ITEM_LABELS.ROOMS', item.rooms);
      }
      if (item.vehicles != null && item.vehicles != '') {
        this.addTableRow(bubbleBig, 'ITEM_LABELS.VEHICLES', item.vehicles);
      }
      if (item.carriers != null && item.carriers != '') {
        this.addTableRow(bubbleBig, 'ITEM_LABELS.CARRIERS', item.carriers);
      }
      if (item.drivingLogNotice != null) {
        this.addTableRow(bubbleBig, 'ITEM_LABELS.DRIVING_LOG_NOTICE', item.drivingLogNotice);
      }

      renderer.appendChild(this.bubbleContainerBig, bubbleBig);
    }

    addTableRow(parentEl: any, label: string, value: string) {
      // Create row div
      let rowEl = renderer.createElement('div');
      renderer.addClass(rowEl, 'row');

      // Create label (left) col div
      let labelEl = renderer.createElement('div');
      renderer.addClass(labelEl, 'col-3');
      renderer.setProperty(labelEl, 'innerHTML', escapeHtml(translateService.instant(label)));

      // Create value (right) col div
      let valueEl = renderer.createElement('div');
      renderer.addClass(valueEl, 'col-9');
      renderer.setProperty(valueEl, 'innerHTML', escapeHtml(value));

      // Append col divs to row div
      renderer.appendChild(rowEl, labelEl);
      renderer.appendChild(rowEl, valueEl);

      // Append row div to parent element and add divider underneath
      renderer.appendChild(parentEl, rowEl);
      this.addDivider(parentEl);
    }

    addDivider(parentEl: any) {
      let dividerEl = renderer.createElement('hr');
      renderer.addClass(dividerEl, 'popup-bubble-divider');
      renderer.appendChild(parentEl, dividerEl);
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

    popToFront() {
      document.querySelectorAll('.tour-info-container').forEach(el => {
        renderer.setStyle(el, 'z-index', -1);
      });

      renderer.setStyle(this.containerDiv, 'z-index', 1);
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
export class DateMapComponent extends LoggedInComponent implements OnInit {

  // Default parameters for the map element. Some of these could be dynamic (TODO).
  map_lat: number = 43;
  map_lng: number = 19;
  map_zoom: number = 7;

  anchorConst: any;
  labelOriginConst: any;

  map: google.maps.Map | null = null;
  mapClickListener: google.maps.MapsEventListener | null = null;

  svgMap: Map<string, string> = svgMap;
  defaultSvgPath: string = defaultSvgPath;

  selectedDate: Date = new Date();
  selectedDateString: string = this.dateStringDashed(this.selectedDate);
  allPointTypes: PointType[] = [];
  tourInfoPoints: TourInfoPoint[] = [];
  tourInfoBank: Map<string, TourInfoPoint[]> = new Map();
  markerContainers: MarkerContainer[] = [];
  markerIconMap: Map<string, any> = new Map();
  shortInfoWindows: TourInfoOverlay[] = [];

  showUnknownTours: boolean = false;
  shortInfos: any = {
    name: true,
    startDate: false,
    tourGuides: false,
    guests: false,
    hotel1: false,
    hotel2: false,
    activities: false,
    rooms: false,
    vehicles: false,
    carriers: false
  };

  constructor(
    protected router: Router,
    protected meService: MeService,
    private zone: NgZone,
    private renderer: Renderer2,
    private translateService: TranslateService,
    private titleService: Title,
    private tourService: TourService,
    private programService: ProgramService
  ) {
    super(router, meService);
  }

  ngOnInit(): void {
    this.getAllPointTypes();

    this.anchorConst = { x: 12, y: 12 };
    this.labelOriginConst = { x: 12, y: 12 };

    renderer = this.renderer;
    translateService = this.translateService;

    setTitle('SUBTITLES.MAP', this.titleService, this.translateService);
  }

  // Workaround necessary since the default way is broken in this version of the agm(?) library.
  // If this is removed, variables: map, mapClickListener, zone; become useless -> remove as well.
  ngOnDestroy(): void {
    if (this.mapClickListener) {
      this.mapClickListener.remove();
    }
  }

  mapReadyHandler($event: google.maps.Map): void {
    this.map = $event;
    this.mapClickListener = this.map.addListener('click', (e: google.maps.MouseEvent) => {
      this.zone.run(() => {
        this.onMapClick(e);
      });
    });
  }
  // End of workaround.

  onMapClick($event: google.maps.MouseEvent): void {
    // TODO: do we do anything on map click?
    // skip
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

  onDateChange(newDateString: any): void {
    let newDate = this.reverseDateString(newDateString);
    this.onDateSelect(newDate);
  }

  onDateSelect(newDate: Date): void {
    this.selectedDate = newDate;
    this.selectedDateString = this.dateStringDashed(this.selectedDate);

    // Request tour info for the new date
    this.getTourInfo();
  }

  onShowUnknownsChange(): void {
    this.getTourInfo();
  }

  onShortInfoFieldsChange(): void {
    // Same tour data points, but use different fields for the short bubble
    this.refreshInfoWindows();
  }

  getTourInfo(): void {
    // Check if this date was already queried
    if (this.tourInfoBank.has(this.dateStringDashed(this.selectedDate))) {
      this.tourInfoPoints = this.tourInfoBank.get(this.dateStringDashed(this.selectedDate)) ?? [];
      this.refreshMarkerContainers();
      return;
    }

    // This is the first time this date is requested, so send the query to the server
    this.tourService.getConfirmedTourInfoForDate(this.selectedDate).subscribe((tourInfo: [TourInfoPoint]) => {
      this.tourInfoPoints = tourInfo;

      // Save date info for possible later use
      // TODO: can this cause too much memory usage?
      if (this.tourInfoPoints.length > 0) {
        this.tourInfoBank.set(this.dateStringDashed(this.tourInfoPoints[0].date), this.tourInfoPoints);
      }

      this.refreshMarkerContainers();
    }, err => this.checkErrUnauthorized(err));
  }

  refreshMarkerContainers(): void {
    this.markerContainers = [];
    this.tourInfoPoints.forEach(p => {
      // Skip points of 'unknown' tours
      if (!this.showUnknownTours && p.status != 'confirmed') {
        return;
      }

      let c: MarkerContainer | undefined = this.markerContainers.find(mc => mc.name == p.program && mc.startDate == p.start_date);
      if (c == null) {
        let roomingList = [];
        if (p.room_single != null) roomingList.push(p.room_single + 'sngl');
        if (p.room_double != null) roomingList.push(p.room_double + 'dbl');
        if (p.room_twin != null) roomingList.push(p.room_twin + 'tw');
        if (p.room_triple != null) roomingList.push(p.room_triple + 'trpl');
        if (p.room_apt != null) roomingList.push(p.room_apt + 'apt');
        if (p.room_staff != null) roomingList.push('staff ' + p.room_staff + '');
        let driverVehiclePair1 = (p.driver1 == null ? '' : p.driver1) + (p.vehicle1 == null ? '' : '(' + p.vehicle1 + ')');
        let driverVehiclePair2 = (p.driver2 == null ? '' : p.driver2) + (p.vehicle2 == null ? '' : '(' + p.vehicle2 + ')');
        let driverVehiclePair3 = (p.driver3 == null ? '' : p.driver3) + (p.vehicle3 == null ? '' : '(' + p.vehicle3 + ')');
        let carrierCombo1 = p.carrier1 == null ? '' : p.carrier1 + (p.type1 == null ? '' : ' - ' + p.type1);
        let carrierCombo2 = p.carrier2 == null ? '' : p.carrier2 + (p.type2 == null ? '' : ' - ' + p.type2);
        let carrierCombo3 = p.carrier3 == null ? '' : p.carrier3 + (p.type3 == null ? '' : ' - ' + p.type3);

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
          tourGuides: p.tour_lead1 == null ? null : p.tour_lead1 + (p.tour_lead2 == null ? '' : ', ' + p.tour_lead2),
          guests: p.guests,
          rooms: roomingList.length == 0 ? null : roomingList.join('/'),
          activities: p.activities,
          vehicles: driverVehiclePair1 == '' ? null : driverVehiclePair1 + (driverVehiclePair2 == '' ? '' : ', ' + driverVehiclePair2 + (driverVehiclePair3 == '' ? '' : ', ' + driverVehiclePair3)),
          carriers: carrierCombo1 == '' ? null : carrierCombo1 + (carrierCombo2 == '' ? '' : ', ' + carrierCombo2 + (carrierCombo3 == '' ? '' : ', ' + carrierCombo3)),
          drivingLogNotice: p.driving_log_notice,
          markers: [],
          color: p.color,
          opacity: p.status == 'confirmed' ? 1.0 : 0.5,
        };
        this.markerContainers.push(c);
      }

      c.markers.push({
        tourName: p.program,
        tourStartDate: p.start_date,
        label: p.location,
        lat: p.location != null ? p.lat : p.ff_lat,
        lng: p.location != null ? p.lng : p.ff_lng,
        iconMapKey: p.point_type,
        showLabel: this.allPointTypes.find(t => t.name == p.point_type)?.preferred_ui_label ?? false
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
      w.addItem(c, this.shortInfos);
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

      // Serialize server requests
      this.getTourInfo();
    }, err => this.checkErrUnauthorized(err));
  }

  getSvgPath(key: string): string {
    let iconName = this.markerIconMap.get(key);
    return svgMap.get(iconName) ?? defaultSvgPath;
  }

  dateStringDashed(d: Date): string {
    return dateStringDashed(d);
  }

  reverseDateString(s: string): Date {
    let date = new Date();

    let parts = s.split('-');
    date.setFullYear(Number(parts[0]));
    date.setMonth(Number(parts[1]) - 1);
    date.setDate(Number(parts[2]));

    return date;
  }

}