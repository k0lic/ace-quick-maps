import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Secrets } from 'secrets';

// Default parameters for the embedded map element. Some of these could be dynamic (TODO).
const MAP_MODE : string = 'view';
const CENTER_LAT : number = 43;
const CENTER_LNG : number = 19;
const ZOOM : number = 7;
const MAP_TYPE : string = 'roadmap';

@Component({
  selector: 'app-new-locations',
  templateUrl: './new-locations.component.html',
  styleUrls: ['./new-locations.component.css']
})
export class NewLocationsComponent implements OnInit {

  constructor(private sanitizer : DomSanitizer) { }

  ngOnInit(): void {
    // this.loadMapScript().then(() => {
    //   console.log("loadMapScript promise resolved")
    // })
  }

  getMapLink() : SafeUrl {
    // Build Google Map Embed URL
    var url : string = 
      "https://www.google.com/maps/embed/v1/"
      + MAP_MODE
      + "?key=" + Secrets.GOOGLE_MAP_API_KEY 
      + "&center=" + CENTER_LAT + "," + CENTER_LNG
      + "&zoom=" + ZOOM
      + "&maptype=" + MAP_TYPE;
    
    // Sanitize URL so angular doesn't freak out (because user input could be used in the URL)
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // loadMapScript() : Promise<null> {
  //   return new Promise((resolve, reject) => {
  //     let script = document.createElement('script');
  //     script.type = 'text/javascript';
  //     script.src =
  //       "https://maps.googleapis.com/maps/api/js"
  //       + "?key=" + Secrets.GOOGLE_MAP_API_KEY 
  //       + "&libraries=" + "drawing"
  //       + "&callback=" + "initMap";
  //     document.getElementsByTagName('head')[0].appendChild(script);
  //     resolve(null)
  //   })
  // }
}

// function initMap() : void {
//   const map = new google.maps.Map(
//     document.getElementById('mapFrame') as HTMLElement,
//     {
//       zoom: ZOOM,
//       center: {
//         lat: CENTER_LAT,
//         lng: CENTER_LNG
//       }
//     }
//   )
// }

// declare global {
//   interface Window {
//     initMap: () => void;
//   }
// }

// window.initMap = initMap;
