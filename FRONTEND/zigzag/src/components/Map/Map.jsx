import React from 'react';
import { MapContainer } from 'react-leaflet';
import '../../index.css'

const Map = ({ isFilterOpen, isLeftMenuOpen, initializeMap, children }) => {
  // Determine screen width once at render time
  const isWideScreen = typeof window !== 'undefined' ? window.innerWidth >= 768 : false;

  // Define world bounds to prevent infinite scrolling
  const worldBounds = [
    [-70, -160], // Southwest corner
    [85, 160]    // Northeast corner - increased to include Greenland
  ];

  // Calculate MapContainer props based on screen size
  const mapProps = {
    key: isWideScreen ? 'wide' : 'narrow',
    center: [48.8566, 2.3522],
    zoom: 12,
    maxZoom: 18,
    minZoom: 2,
    zoomSnap: 1.0,
    zoomDelta: 1.0,
    maxBounds: worldBounds,
    maxBoundsViscosity: 0.8,
    noWrap: true,
    zoomControl: isWideScreen, // Show controls only on wide screens
    whenCreated: initializeMap,
    style: {
      height: '100%',
      width: '100%',
      position: 'relative',
      margin: 0,
      padding: 0,
      filter: isFilterOpen || isLeftMenuOpen ? 'brightness(50%) blur(5px)' : 'none',
    }
  };

  return (
    <div className="map-container">
      {/* Conditionally show overlay if filters are open */}
      {(isFilterOpen || isLeftMenuOpen) && (<div className="overlay" />)}
      {children}

      <MapContainer {...mapProps} />
    </div>
  );
};

export default Map;
