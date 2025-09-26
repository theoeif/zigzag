import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import EventView from "./EventView/EventView";

// might be a duplicate of EventPopup.jsx, needs to understand the difference model vs full page
// eventCoordinates check if is pass through from MarkerMaps.jsx
const DirectEventLinkView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const eventCoordinates = location.state?.eventCoordinates;
  
  const handleClose = () => {
    if (eventCoordinates) {
      navigate("/", {
        state: {
          mapState: { 
            lat: eventCoordinates.lat, 
            lng: eventCoordinates.lng, 
            zoom: 15 
          }
        }
      });
    } else {
      navigate("/");
    }
  };
  
  return (
    <EventView
      eventId={id}
      displayMode="fullpage"
      onClose={handleClose}
    />
  );
};

export default DirectEventLinkView; 