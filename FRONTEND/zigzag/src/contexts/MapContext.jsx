import React, { createContext, useState } from "react";

export const MapContext = createContext();

export const MapProvider = ({ children }) => {
  const [mapState, setMapState] = useState({
    center: { lat: 48.8566, lng: 2.3522 }, // Default: Paris
    zoom: 12,
  });

  // Timeframe state for global timeframe management
  const [timeframe, setTimeframe] = useState(() => {
    // Default: current date to current date + 1 month (one month range)
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 2);
    return { start, end };
  });

  return (
    <MapContext.Provider value={{ mapState, setMapState, timeframe, setTimeframe }}>
      {children}
    </MapContext.Provider>
  );
};
