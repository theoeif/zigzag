// Impact of Strci MODE ?????
// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'
// import "leaflet/dist/leaflet.css";

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )


// Functionnable : 
import React from 'react';
import { createRoot } from 'react-dom/client'; // Use createRoot instead of render
import './index.css';
import App from './App.jsx';
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { AuthProvider } from './contexts/AuthProvider';
import { BrowserRouter } from "react-router-dom";
import { MapProvider } from "./contexts/MapContext.jsx";

// Create a root and render the app
createRoot(document.getElementById('root')).render(
  <AuthProvider>
  <MapProvider>
    <BrowserRouter>
    <App />
    </BrowserRouter>
  </MapProvider>
  </AuthProvider>
);