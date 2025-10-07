import React from 'react';
import { MapContainer } from 'react-leaflet';
import '../../index.css'
import TimelineBar from "../TimelineBar/TimelineBar";

const Map = ({ isFilterOpen, isLeftMenuOpen, initializeMap, children }) => {
  // Define world bounds to prevent infinite scrolling
  const worldBounds = [
    [-70, -160], // Southwest corner
    [85, 160]    // Northeast corner - increased to include Greenland
  ];

  return (
    <div className="map-container">
      {/* Conditionally show overlay if filters are open */}
      {(isFilterOpen || isLeftMenuOpen) && (<div className="overlay" />)}
      {children}

      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={12}
        maxZoom={18}
        minZoom={2}
        zoomSnap={1.0}      // Standard integer zooms
        zoomDelta={1.0}     // Standard zoom steps
        maxBounds={worldBounds}
        maxBoundsViscosity={0.8}
        noWrap={true}       // Prevent world wrapping
        whenCreated={initializeMap}
        style={{
          height: '100vh',
          width: '100%',
          position: 'relative', // Important pour le z-index
          filter: isFilterOpen || isLeftMenuOpen ? 'brightness(50%) blur(5px)' : 'none',
        }}
      />

    </div>
  );
};

export default Map;
