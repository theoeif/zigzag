import L from "leaflet";

// Regular project marker (red)
const redMarkerIcon = L.divIcon({
  className: "custom-red-marker",
  html: `
    <div class="marker_container">
      <div class="marker_pulse"></div>
      <div class="marker_icon"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [12, 12],
});

// Friend location marker (white with blue border)
const whiteFriendsEventlocationMarkerIcon = L.divIcon({
  className: "custom-white-marker",
  html: `
    <div class="marker_container">
      <div class="marker_pulse"></div>
      <div class="marker_icon"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [12, 12],
});

// Public event marker (green)
const greenMarkerIcon = L.divIcon({
  className: "custom-green-marker",
  html: `
    <div class="marker_container">
      <div class="marker_pulse"></div>
      <div class="marker_icon"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [12, 12],
});

export {
  redMarkerIcon,
  whiteFriendsEventlocationMarkerIcon,
  greenMarkerIcon
};

// Styles are defined in index.css - no need to add them here
