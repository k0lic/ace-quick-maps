import { Component, NgZone, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LoggedInComponent } from '../_abstracts/logged-in.component';
import { PaxNightsByLocation } from '../_entities/pax-nights-by-location';
import { defaultSvgPath } from '../_helpers/svgHelper';
import { setTitle } from '../_helpers/titleHelper';
import { MeService } from '../_services/me.service';
import { StatService } from '../_services/stat.service';

// Marker interface, used for presenting the points on the map
interface Coord {
  lat: number;
  lng: number;
}

interface Marker {
	lat: number;
	lng: number;
  path: Coord[],
  description: string;
}

@Component({
  selector: 'app-stat-map',
  templateUrl: './stat-map.component.html',
  styleUrls: ['./stat-map.component.css']
})
export class StatMapComponent extends LoggedInComponent implements OnInit {

  // Default parameters for the map element. Some of these could be dynamic (TODO).
  map_lat : number = 43;
  map_lng : number = 19;
  map_zoom : number = 7;

  map : google.maps.Map|null = null;
  mapClickListener : google.maps.MapsEventListener|null = null;

  markers: Marker[] = [];

  anchorConst: any;
  labelOriginConst: any;

  constructor(
    protected router: Router,
    protected meService: MeService,
    private zone: NgZone,
    private titleService: Title,
    private translateService: TranslateService,
    private statService: StatService
  ) {
    super(router, meService);
  }

  ngOnInit(): void {
    this.refreshStats();

    this.anchorConst = {x: 12, y: 12};
    this.labelOriginConst = {x: 12, y: 12};

    setTitle('STATS.TITLE', this.titleService, this.translateService);
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
    // skip
  }

  refreshStats(): void {
    this.refreshPaxNightsByLocationMap();
  }

  refreshPaxNightsByLocationMap(): void {
    this.statService.getPaxNightsByLocation().subscribe((rows: PaxNightsByLocation[]) => {
      // Convert PaxNightsByLocation into markers we can show on the map
      let tmpList: Marker[] = [];
      rows.forEach(row => {
        let radiusQ = Math.sqrt(row.pax_nights);

        tmpList.push({
          lat: row.lat,
          lng: row.lng,
          path: this.createCirclePath(row.lat, row.lng, radiusQ),
          // description: this.translateService.instant(
          //   'STATS.LOCATION_NUMBER_PATTERN', 
          //   {
          //     location: this.translateService.instant(row.location), 
          //     number: row.pax_nights
          //   })
          description: row.pax_nights + ''
        });
      });

      this.markers = tmpList;
    }, err => this.checkErrUnauthorized(err));
  }

  createCirclePath(centerLat: number, centerLng: number, radiusQ: number): Coord[] {
    let steps = 16;
    let radiusBase = 0.005;
    let radius = radiusBase * radiusQ;

    let path: Coord[] = [];
    for (let i = 0; i< steps; i++) {
      path.push({
        lat: centerLat + radius * Math.sin(2 * Math.PI * i / steps),
        lng: centerLng + radius * Math.cos(2 * Math.PI * i / steps)
      });
    }

    return path;
  }

  getSvgPath(): string {
    return defaultSvgPath;
  }

}
