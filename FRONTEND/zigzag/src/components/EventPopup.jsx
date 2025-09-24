// EventPopup.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPublicEvent } from "../api/api";
import EventView from "./EventView";

const EventPopup = ({ eventId: propEventId, initialData }) => {
  const params = useParams();
  const id = propEventId || params.id; // Use prop if provided, otherwise use from URL
  const navigate = useNavigate();
  
  const [eventData, setEventData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initialData) {
      const getEventDetails = async () => {
        try {
          // Use fetchPublicEvent which works for both authenticated and unauthenticated users
          const data = await fetchPublicEvent(id);
          setEventData(data);
        } catch (err) {
          console.error("Error fetching event details:", err);
          setError("Failed to load event details. " + (err.response?.data?.error || err.message));
        } finally {
          setLoading(false);
        }
      };
      
      getEventDetails();
    } else {
      // Initialize with provided data
      setLoading(false);
    }
  }, [id, initialData]);

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
