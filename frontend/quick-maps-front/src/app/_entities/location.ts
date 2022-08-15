export class Location {
    name: String;
    coord_lat: Number;
    coord_lng: Number;

    constructor(name: String, coord_lat: Number, coord_lng: Number) {
        this.name = name;
        this.coord_lat = coord_lat;
        this.coord_lng = coord_lng;
    }
}