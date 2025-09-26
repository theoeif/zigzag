// EventPopup.jsx
import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import EventView from "./EventView/EventView";

const EventPopup = ({ eventId: propEventId, initialData }) => {
  const params = useParams();
  const id = propEventId || params.id; // Use prop if provided, otherwise use from URL
  const navigate = useNavigate();
  const location = useLocation();
  
  const eventData = initialData || null;
  const loading = false;
  const error = null;

  const handleClose = () => {
    const background = location.state?.background || "/";
    const mapState = location.state?.mapState;

    if (mapState) {
      navigate(background, { state: { mapState } });
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(background);
    }
  };

  if (loading) return <div className="modal-overlay"><div className="modal-content">Loading event details...</div></div>;
  if (error && !eventData) return <div className="modal-overlay"><div className="modal-content">Error: {error}</div></div>;

  // Get the original map state from location state if available
  const originalMapState = location.state?.mapState;
  
  return (
    <EventView
      eventId={id}
      displayMode="modal"
      onClose={handleClose}
      initialData={eventData}
      originalMapState={originalMapState}
    />
  );
};

export default EventPopup;
