import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import EventView from "./EventView/EventView";
import { fetchDirectEvent } from "../../api/api";
import { AuthContext } from "../../contexts/AuthProvider";

// Direct event link view - handles event data fetching and map centering
const DirectEventLinkView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, isLoading } = useContext(AuthContext);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication and redirect to login if not connected
  useEffect(() => {
    if (!isLoading && !isConnected) {
      navigate(`/login?redirect=${encodeURIComponent(`/event/${id}`)}`);
    }
  }, [isConnected, isLoading, navigate, id]);

  // Fetch event data on component mount (only when authenticated)
  useEffect(() => {
    if (!isConnected || isLoading) return;

    const loadEventData = async () => {
      try {
        setLoading(true);
        const data = await fetchDirectEvent(id);
        setEventData(data);
        setError(null);
      } catch (err) {
        console.error("DirectEventLinkView: Error loading event:", err);
        setError("Could not load this event.");
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [id, isConnected, isLoading]);

  const isModalMode = location.state?.background;

  const handleClose = () => {
    if (isModalMode) {
      // Modal mode: go back to background map
      navigate(-1);
    } else {
      // Direct link mode: navigate to home map centered on event
      const mapState = location.state?.mapState || {
        center: {
          lat: eventData?.lat || eventData?.address?.latitude,
          lng: eventData?.lng || eventData?.address?.longitude
        },
        zoom: 15
      };
      navigate("/", { state: { mapState } });
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f5f5f5"
      }}>
        <div>Checking authentication...</div>
      </div>
    );
  }

  // Show loading while fetching event data
  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f5f5f5"
      }}>
        <div>Loading event details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#f5f5f5",
        padding: "20px"
      }}>
        <h2>Event Not Available</h2>
        <p>{error}</p>
        <button
          onClick={handleClose}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#4CAF50",
            color: "white",
            cursor: "pointer",
            marginTop: "10px"
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  // Get the original map state from location state if available
  const originalMapState = location.state?.mapState;

  return (
    <EventView
      eventId={id}
      displayMode="fullpage"
      onClose={handleClose}
      initialData={eventData}
      originalMapState={originalMapState}
      isModalMode={isModalMode}
    />
  );
};

export default DirectEventLinkView;
