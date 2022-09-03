import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '../_entities/location';
import { LocationService } from '../_services/location.service';
// import { MouseEvent } from '@agm/core';

// Marker interface, used for presenting the places on the map, and then for sending the newly created places to the backend.
interface Marker {
  label: string;
	lat: number;
	lng: number;
  hasName: boolean;
  isSaved: boolean; // useless? right now - yes
}

@Component({
  selector: 'app-new-locations',
  templateUrl: './new-locations.component.html',
  styleUrls: ['./new-locations.component.css']
})
export class NewLocationsComponent implements OnInit, OnDestroy {

  @ViewChild('inputPlaceNameTag') inputPlaceNameElement!: ElementRef<HTMLInputElement>;
  newPlaceName : string = '';
  
  // Default parameters for the map element. Some of these could be dynamic (TODO).
  map_lat : number = 43;
  map_lng : number = 19;
  map_zoom : number = 7;

  map : google.maps.Map|null = null;
  mapClickListener : google.maps.MapsEventListener|null = null;

  markers: Marker[] = []

  iconObj : any;

  constructor(private zone: NgZone, public translateService: TranslateService, private locationService: LocationService) { }

  ngOnInit(): void {
    // Retrieve locations from the server
    this.refreshMarkers();

    this.iconObj = {
      url: "../../assets/icons/place_purple.svg",
      labelOrigin: {x: 18, y: -6}
    };
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

  refreshMarkers(): void {
    this.locationService.getAllLocations().subscribe((locations: [Location]) => {
      locations.forEach(loc => {
        this.markers.push({
          label: loc.name,
          lat: loc.lat,
          lng: loc.lng,
          hasName: true,
          isSaved: true
        });
      });
    }, err => {
      // Layout will perform redirect if necessary
      console.log(err);
    });
  }

  onMapClick($event : google.maps.MouseEvent): void {
    // Decide if new marker is to be added, or the one that was added last should just be moved.
    if (this.markers.length == 0 || this.markers[this.markers.length - 1].hasName) {
      // There are no unnamed markers, user wants to add new marker.
      this.addNewMarker(null, $event.latLng.lat(), $event.latLng.lng());
    } else {
      // Marker that was already added has no name, user decided to move it.
      this.moveLastMarker($event);
    }

    // Focus on place name input element for easier workflow.
    this.focusPlaceNameInput();
  }

  focusPlaceNameInput(): void {
    this.inputPlaceNameElement.nativeElement.focus();
  }

  addNewMarker(label: string | null, lat: number, lng: number): void {
    this.markers.push({
      label: label ?? "",
      lat: lat,
      lng: lng,
      hasName: label != null,
      isSaved: false
    });
  }

  moveLastMarker($event : google.maps.MouseEvent): void {
    let index = this.markers.length - 1;
    this.markers[index].lat = $event.latLng.lat();
    this.markers[index].lng = $event.latLng.lng();
  }

  nameLastMarker(name : string): void {
    // No marker to name.
    if (this.markers.length == 0) {
      return;
    }

    let index = this.markers.length - 1;
    // Check if last marker already has name.
    if (this.markers[index].hasName) {
      // Ignore new name
      return;
    }

    // Name last marker, since it has no name yet.
    this.markers[index].label = name;
    this.markers[index].hasName = true;

    // Send last marker to server
    let newLocation = this.markers[index];
    this.locationService.addLocation(newLocation.label, newLocation.lat, newLocation.lng).subscribe(res => {
      // skip
    }, err => {
      console.log(err);
      // Server failed adding the marker, remove it from ui
      this.markers.splice(index, 1);
    });
  }

  onEnterPress(): void {
    // Perform naming
    this.nameLastMarker(this.newPlaceName);

    // Reset input element.
    this.newPlaceName = "";
  }

  removeMarker(index: number): void {
    // Remove one element at 'index'.
    let label = this.markers[index].label;
    let lat = this.markers[index].lat;
    let lng = this.markers[index].lng;
    let hasName = this.markers[index].hasName;
    this.markers.splice(index, 1);

    // Remove location from server
    if (hasName) {
      this.locationService.deleteLocation(label).subscribe(res => {
        // skip
      }, err => {
        console.log(err);
        // Server failed removing the marker, add it back to ui
        this.addNewMarker(label, lat, lng);
      });
    }

    // Focus on place name input element for easier workflow.
    this.focusPlaceNameInput();
  }

  onMarkerDragEnd(index: number, $event: any): void {
    // Update marker coords.
    let oldLat = this.markers[index].lat;
    let oldLng = this.markers[index].lng;
    this.markers[index].lat = $event.latLng.lat();
    this.markers[index].lng = $event.latLng.lng();

    // Update location coords on server
    let marker = this.markers[index];
    if (marker.hasName) {
      this.locationService.moveLocation(marker.label, marker.lat, marker.lng).subscribe(res => {
        // skip
      }, err => {
        console.log(err);
        // Server failed moving the marker, move it back to where it was
        this.markers[index].lat = oldLat;
        this.markers[index].lng = oldLng;
      });
    }

    // Focus on place name input element for easier workflow.
    this.focusPlaceNameInput();
  }

}
