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
  iconSize: [24, 24],
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
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});


export {
  redMarkerIcon,
  whiteFriendsEventlocationMarkerIcon,
};

// Styles are defined in index.css - no need to add them here
