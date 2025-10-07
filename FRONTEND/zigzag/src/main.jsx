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


// TAILWIND TEST
// import React from "react";
// import ReactDOM from "react-dom/client";
// import './index.css';  // Import Tailwind styles

// const App = () => (
//   <div className="bg-gray-100 min-h-screen flex items-center justify-center">
//     <header className="bg-green-700 text-white py-4 px-6 shadow-lg">
//       <h1 className="text-2xl font-bold text-center">Minimal Tailwind Test</h1>
//     </header>
//   </div>
// );

// ReactDOM.createRoot(document.getElementById("root")).render(<App />);
