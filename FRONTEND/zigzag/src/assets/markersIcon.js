import markerImage from "./marker.png";

// Define the custom marker icon
export const redMarkerIcon = new L.Icon({
  iconUrl: markerImage,
  iconSize: [40, 40],
  iconAnchor: [17, 46],
  popupAnchor: [0, -46],
});

export const blueMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png", // Default blue Leaflet marker
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41],
});

export default redMarkerIcon; blueMarkerIcon ;
