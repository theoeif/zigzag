// EventPopup.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import EventView from "./EventView/EventView";

const EventPopup = ({ eventId: propEventId, initialData }) => {
  const params = useParams();
  const id = propEventId || params.id; // Use prop if provided, otherwise use from URL
  const navigate = useNavigate();
  
  const eventData = initialData || null;
  const loading = false;
  const error = null;

  const handleClose = () => {
    navigate("/");
  };

  if (loading) return <div className="modal-overlay"><div className="modal-content">Loading event details...</div></div>;
  if (error && !eventData) return <div className="modal-overlay"><div className="modal-content">Error: {error}</div></div>;
  if (!eventData) return <div className="modal-overlay"><div className="modal-content">Event not found</div></div>;

  return (
    <EventView
      eventId={id}
      displayMode="modal"
      onClose={handleClose}
      initialData={eventData}
    />
  );
};

export default EventPopup;
