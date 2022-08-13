import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
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

  constructor(private zone: NgZone) { }

  ngOnInit(): void { }

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
    // Decide if new marker is to be added, or the one that was added last should just be moved.
    if (this.markers.length == 0 || this.markers[this.markers.length - 1].hasName) {
      // There are no unnamed markers, user wants to add new marker.
      this.addNewEmptyMarker($event);
    } else {
      // Marker that was already added has no name, user decided to move it.
      this.moveLastMarker($event);
    }

    // Focus on place name input element for easier workflow.
    this.inputPlaceNameElement.nativeElement.focus();
  }

  addNewEmptyMarker($event : google.maps.MouseEvent): void {
    this.markers.push({
      label: "",
      lat: $event.latLng.lat(),
      lng: $event.latLng.lng(),
      hasName: false,
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
      // TODO: what now?
      return;
    }

    // Name last marker, since it has no name yet.
    this.markers[index].label = name;
    this.markers[index].hasName = true;
  }

  onEnterPress(): void {
    // Perform naming
    this.nameLastMarker(this.newPlaceName);

    // Reset input element.
    this.newPlaceName = "";
  }

  removeMarker(index: number): void {
    // Remove one element at 'index'.
    this.markers.splice(index, 1);
  }

  onMarkerDragEnd(index: number, $event: any): void {
    // Update marker coords.
    this.markers[index].lat = $event.latLng.lat();
    this.markers[index].lng = $event.latLng.lng();
  }

  submitMarkers(): void {
    // Skip if marker array is empty.
    if (this.markers.length == 0) {
      return;
    }

    let lastIndex = this.markers.length - 1;
    // Trim last marker if it has no name.
    if (this.markers[lastIndex].hasName == false) {
      this.markers.splice(lastIndex, 1);
    }

    // Check if there's anything left to send.
    if (this.markers.length > 0) {
      // TODO: send markers to backend :)
      this.markers.forEach(marker => {
        console.log(marker.label + "\t" + marker.lat + " " + marker.lng);
      });
    }
    
    // Clear markers, should be done when we're sure of delivery.
    this.clearMarkers();
  }

  clearMarkers(): void {
    // Remove all elements.
    this.markers.splice(0, this.markers.length);
  }

  markers: Marker[] = []

}
