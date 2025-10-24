import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthProvider";
import { MapContext } from "../../../contexts/MapContext";
import {
  fetchDirectEvent,
  generateEventInvite
} from "../../../api/api";
import { FRONTEND_URL } from "../../../config";
import MarkersMap from "../../MarkersMap";
import CircleMembersPopup from "../../Project/CircleMembersPopup";
import EventDetailsSection from "../../Project/EventDetailsSection";
import {
  FaMapMarkerAlt,
  FaUser,
  FaLink,
  FaUsers,
  FaUserFriends,
  FaCircle,
  // See more icon to navigate to project page
  FaInfoCircle,
  FaPaperPlane
} from "react-icons/fa";

// Styles for the event view
const styles = {
  // Full page styles
  fullpage: {
    container: {
      position: "relative",
      height: "100vh",
    },
    mapContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 1,
    },
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  // Modal styles
  modal: {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  // Shared styles
  card: {
    backgroundColor: "white",
    borderRadius: "8px", // All corners rounded
    padding: "20px",
    width: "90%",
    maxWidth: "500px",
    maxHeight: "80vh",
    overflow: "auto",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    position: "relative",
  },
  title: {
    fontSize: "1.5rem",
    marginTop: "-5px",
    marginBottom: "15px",
    color: "#333",
    paddingRight: "80px", // Make room for the date badge
  },
  details: {
    marginBottom: "20px",
  },
  detailItem: {
    display: "flex",
    alignItems: "center",
    margin: "8px 0",
    fontSize: "0.95rem",
  },
  addressItem: {
    display: "flex",
    alignItems: "center",
    margin: "8px 0",
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "color 0.2s ease",
  },
  timeDetail: {
    display: "flex",
    alignItems: "center",
    margin: "8px 0",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  detailIcon: {
    marginRight: "8px",
    color: "#40916c", // LeftMenu green color
    minWidth: "20px",
  },
  // Date badge styles like in EventCard
  eventDateBadge: {
    position: "absolute",
    top: "0",
    right: "0",
    backgroundColor: "#40916c", // LeftMenu green color
    color: "white",
    padding: "12px 16px", // Increased padding for wider rectangle
    borderRadius: "0 0 0 8px",
    textAlign: "center",
    width: "90px", // Increased width for better rectangle
    cursor: "pointer",
    userSelect: "none",
  },
  dayName: {
    fontSize: "0.8rem",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  dateTimeCompact: {
    fontSize: "0.9rem",
    fontWeight: "bold",
  },
  timeCompact: {
    fontSize: "0.8rem",
  },
  buttons: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
  },
  button: {
    padding: "8px 16px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    margin: "0 5px",
  },
  primaryButton: {
    backgroundColor: "#40916c", // LeftMenu green color
    color: "white",
  },
  secondaryButton: {
    backgroundColor: "#f1f1f1",
    color: "#333",
  },
  errorMessage: {
    color: "red",
    marginBottom: "15px",
  },
  tagsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
    marginBottom: "15px",
  },
  tag: {
    backgroundColor: "#f0f7f4",
    borderRadius: "16px",
    padding: "4px 12px",
    fontSize: "0.9rem",
    color: "#2d6a4f",
  },
  participantsRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
    marginTop: "10px",
    marginBottom: "15px",
  },
  circlesContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
    marginBottom: "15px",
  },
  circle: {
    backgroundColor: "#f0f7f4",
    borderRadius: "16px",
    padding: "4px 12px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  circleIcon: {
    fontSize: "0.8rem",
    color: "#2d6a4f",
  },
  participationInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "15px 0",
  },
  participantsCount: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.9rem",
    color: "#555",
  },
  participationButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 12px",
    borderRadius: "20px",
    border: "1px solid #4CAF50",
    background: "white",
    color: "#4CAF50",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  participatingButton: {
    background: "#4CAF50",
    color: "white",
  },
  shareSection: {
    marginTop: "20px",
    padding: "15px 0",
    borderTop: "1px solid #eee",
  },
  shareButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    backgroundColor: "#f1f1f1",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.3s ease",
  },
  shareButtonClicked: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    backgroundColor: "#40916c",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.3s ease",
    transform: "scale(1.1)",
    boxShadow: "0 0 10px rgba(64, 145, 108, 0.5)",
  },
  shareButtonIcon: {
    fontSize: "16px",
  },
  copiedTooltip: {
    position: "absolute",
    bottom: "40px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#40916c", // LeftMenu green color
    color: "white",
    padding: "5px 10px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    whiteSpace: "nowrap",
    zIndex: 1000,
  },
  errorTooltip: {
    position: "absolute",
    bottom: "40px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#e74c3c", // Red color for errors
    color: "white",
    padding: "5px 10px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    whiteSpace: "nowrap",
    zIndex: 1000,
  },
  shareLinkError: {
    position: "absolute",
    bottom: "40px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#f44336",
    color: "white",
    padding: "5px 10px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    whiteSpace: "nowrap",
    zIndex: 1000,
    width: "180px",
    textAlign: "center",
  },
  shareLinkErrorPopup: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(244, 67, 54, 0.95)",
    color: "white",
    padding: "15px 20px",
    borderRadius: "4px",
    fontSize: "0.9rem",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    zIndex: 2000,
    maxWidth: "300px",
    textAlign: "center",
    animation: "fadeIn 0.3s"
  },
  bottomButtons: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
    borderTop: "1px solid #eee",
    paddingTop: "15px",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f5f5f5",
  },
  errorContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  }
};

const EventView = ({
  eventId,
  displayMode = 'fullpage',
  onClose,
  initialData = null,
  originalMapState = null
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setMapState } = useContext(MapContext);
  const { isConnected } = useContext(AuthContext);

  // Derive modal mode from displayMode and location state
  const isModalMode = displayMode === 'fullpage' && location.state?.background;

  // State
  const [event, setEvent] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [showEndTime, setShowEndTime] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [shareButtonClicked, setShareButtonClicked] = useState(false);
  const [invitationButtonClicked, setInvitationButtonClicked] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [addressHovered, setAddressHovered] = useState(false);

  // Circle members popup state
  const [showCircleMembers, setShowCircleMembers] = useState(false);
  const [selectedCircleIds, setSelectedCircleIds] = useState([]);
  const [selectedCircleName, setSelectedCircleName] = useState('');

  // Event details modal state
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Invitation link state
  const [invitationUrl, setInvitationUrl] = useState('');
  const [invitationError, setInvitationError] = useState(null);
  const [canGenerateInvite, setCanGenerateInvite] = useState(false);
  const [invitationCopied, setInvitationCopied] = useState(false);

  // Fetch event data
  useEffect(() => {
    if (!initialData) {
      const loadEvent = async () => {
        try {
          setLoading(true);
          const eventData = await fetchDirectEvent(eventId);
          setEvent(eventData);
          
          // Simply use the backend-calculated permission
          setCanGenerateInvite(eventData.can_generate_invite || false);
          
          setShareUrl(`${FRONTEND_URL}/event/${eventId}`);
          setError(null);
        } catch (err) {
          console.error("Error loading event:", err);
          setError("Impossible de charger cet événement.");
        } finally {
          setLoading(false);
        }
      };
      loadEvent();
    } else {
      setEvent(initialData);
      // Use the backend-calculated permission
      setCanGenerateInvite(initialData.can_generate_invite || false);
      setShareUrl(`${FRONTEND_URL}/event/${eventId}`);
      setLoading(false);
    }
  }, [eventId, isConnected, initialData]);


  // Format functions from EventCard
  const formatFullDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Base format without time
    const dateFormat = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    // Add time format only if time is not midnight
    if (hours !== 0 || minutes !== 0) {
      return date.toLocaleDateString('en-US', {
        ...dateFormat,
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return date.toLocaleDateString('en-US', dateFormat);
  };

  const handleSeeMore = () => {
    setShowEventDetails(true);
  };

  // Format date only (month + day)
  const formatDateOnly = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time only - only show time if it's not midnight (00:00)
  const formatTimeOnly = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // If both hours and minutes are 0 (midnight), don't show the time
    if (hours === 0 && minutes === 0) {
      return "";
    }

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Create a short, beautiful description preview (EventView only)
  const getDescriptionPreviewParagraphs = (description) => {
    if (!description) return [];
    const MAX = 250; // target length budget for preview
    
    // Simple text processing that preserves bullet points and formatting
    let text = String(description).trim();
    
    // Only normalize line endings, don't modify content structure
    text = text.replace(/\r\n/g, '\n');
    
    // Split by double newlines to get paragraphs, but preserve single newlines within paragraphs
    const rawParagraphs = text.split(/\n{2,}/);
    const result = [];
    let used = 0;
    
    for (let i = 0; i < rawParagraphs.length; i++) {
      const p = rawParagraphs[i].trim();
      if (!p) continue;
      
      if (used + p.length <= MAX) {
        result.push(p);
        used += p.length + 2; // account for spacing
      } else {
        const remaining = Math.max(0, MAX - used);
        if (remaining > 20) {
          const slice = p.slice(0, remaining);
          const lastSpace = slice.lastIndexOf(' ');
          const trimmed = slice.slice(0, lastSpace > 0 ? lastSpace : remaining).trimEnd();
          result.push(`${trimmed}...`);
        }
        break;
      }
    }
    return result;
  };

  // Get day name
  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Toggle showing end time
  const toggleEndTimeDisplay = () => {
    setShowEndTime(!showEndTime);
  };

  // Event handlers
  const handleLogin = () => {
    // Redirect to login with return path
    navigate(`/login?redirect=${encodeURIComponent(`/event/${eventId}`)}`);
  };



  const handleViewOnMap = () => {
    // Update MapContext with event coordinates and navigate to map
    if (event && (
      (event.lat && event.lng) ||
      (event.address && event.address.latitude && event.address.longitude)
    )) {
      const lat = event.lat || (event.address && event.address.latitude);
      const lng = event.lng || (event.address && event.address.longitude);

      // Update MapContext with event coordinates
      setMapState({
        center: { lat, lng },
        zoom: 15
      });

      // Navigate to map with event ID in state
      navigate("/", {
        state: {
          fromEvent: true,
          eventId: eventId, // Pass the event ID
          eventCoordinates: { lat, lng }
        }
      });
    } else {
      // Fallback to home page if no coordinates
      navigate("/");
    }
  };


  const handleShareEvent = async () => {
    try {
      setUrlCopied(false);
      setShareError(null);

      // Add click animation effect
      setShareButtonClicked(true);
      setTimeout(() => setShareButtonClicked(false), 300);

      // Respect host setting to disable link sharing
      if (event && event.shareable_link === false) {
        setShareError("L'hôte a désactivé le partage de lien pour cet événement");
        setTimeout(() => setShareError(null), 3000);
        return;
      }

      // Try modern clipboard API first (works on HTTPS and secure contexts)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setUrlCopied(true);
          setTimeout(() => setUrlCopied(false), 2000);
          return;
        } catch (clipboardError) {
          console.log("Clipboard API failed, trying fallback:", clipboardError);
        }
      }

      // Fallback for mobile browsers and non-HTTPS contexts
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setUrlCopied(true);
          setTimeout(() => setUrlCopied(false), 2000);
        } else {
          throw new Error('execCommand failed');
        }
      } finally {
        document.body.removeChild(textArea);
      }

    } catch (error) {
      console.error("Error copying share link:", error);
      setShareError("Échec de la copie du lien");
      setTimeout(() => setShareError(null), 3000);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setInvitationError(null);
      // Add click animation effect for invitation button only
      setInvitationButtonClicked(true);
      setTimeout(() => setInvitationButtonClicked(false), 300);
      
      const response = await generateEventInvite(eventId);
      setInvitationUrl(response.invitation_url);
      
      // Immediately copy the link to clipboard
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(response.invitation_url);
          setInvitationCopied(true);
          setTimeout(() => setInvitationCopied(false), 2000);
        } else {
          // Fallback for mobile browsers and non-HTTPS contexts
          const textArea = document.createElement('textarea');
          textArea.value = response.invitation_url;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          textArea.style.opacity = '0';
          textArea.style.pointerEvents = 'none';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          if (successful) {
            setInvitationCopied(true);
            setTimeout(() => setInvitationCopied(false), 2000);
          }
          document.body.removeChild(textArea);
        }
      } catch (copyError) {
        console.error("Error copying invitation link:", copyError);
        // Don't show error for copy failure, just continue
      }
    } catch (error) {
      console.error("Error generating invitation link:", error);
      setInvitationError("Échec de la génération du lien d'invitation");
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      // Add click animation effect for invitation button
      setInvitationButtonClicked(true);
      setTimeout(() => setInvitationButtonClicked(false), 300);
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(invitationUrl);
        setInvitationCopied(true);
        setTimeout(() => setInvitationCopied(false), 2000);
      } else {
        // Fallback for mobile browsers and non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = invitationUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        if (successful) {
          setInvitationCopied(true);
          setTimeout(() => setInvitationCopied(false), 2000);
        } else {
          throw new Error('execCommand failed');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error("Error copying invitation link:", error);
      alert("Échec de la copie du lien d'invitation");
    }
  };

  const openGoogleMaps = () => {
    // Get latitude and longitude values
    let latitude = null;
    let longitude = null;

    if (event.address && event.address.latitude && event.address.longitude) {
      latitude = event.address.latitude;
      longitude = event.address.longitude;
    } else if (event.lat && event.lng) {
      latitude = event.lat;
      longitude = event.lng;
    }

    // Verify that we have valid coordinates
    if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
      // On desktop, just open in browser
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      // If coordinates are not available, try to search by address
      const address = event.address?.address_line || "Emplacement non disponible";
      const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(googleMapsSearchUrl, '_blank');
    }
  };

  // Handle viewing circle members
  const handleViewCircleMembers = (circle) => {
    if (!circle || (!circle.id && circle.id !== 0)) {
      console.error("EventView: Invalid circle data:", circle);
      return;
    }

    // console.log("EventView: Viewing circle members for circle:", circle);

    // Make sure we have valid data
    const circleId = circle.id;
    const circleName = circle.name || `Circle ${circleId}`;

    // Only proceed if we have an ID
    if (circleId !== undefined && circleId !== null) {
      setSelectedCircleIds([circleId]);
      setSelectedCircleName(circleName);
      setShowCircleMembers(true);
    } else {
      console.error("EventView: Missing circle ID:", circle);
    }
  };

  // Handle viewing all circle members for an event
  const handleViewAllCircleMembers = () => {
    if (!event || !event.circles || !Array.isArray(event.circles) || event.circles.length === 0) {
      console.error("EventView: No circles found for this event");
      return;
    }

    // Extract all circle IDs
    const allCircleIds = event.circles.map(circle => circle.id);

    setSelectedCircleIds(allCircleIds);
    setSelectedCircleName("Participants");
    setShowCircleMembers(true);
  };

  // Render loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Loading event details...</div>
      </div>
    );
  }

  // Render error state
  if (error && !event) {
    return (
      <div style={styles.errorContainer}>
        <h2>Event Not Available</h2>
        <p>{error}</p>
        <div style={styles.buttons}>
          <button
            style={{...styles.button, ...styles.primaryButton}}
            onClick={handleViewOnMap}
          >
            Go to Map
          </button>
          {!isConnected && (
            <button
              style={{...styles.button, ...styles.secondaryButton}}
              onClick={handleLogin}
            >
              Log In
            </button>
          )}
        </div>
      </div>
    );
  }

  // Restricted view removed; always show full event details

  // Render the EventView based on displayMode
  if (displayMode === 'fullpage') {
    return (
      <div style={styles.fullpage.container}>
        {/* Only render map for direct link access, not modal mode */}
        {!isModalMode && (
          <div style={styles.fullpage.mapContainer}>
            <MarkersMap
              eventCoordinates={event ? {
                lat: event.lat || (event.address && event.address.latitude),
                lng: event.lng || (event.address && event.address.longitude)
              } : null}
            />
          </div>
        )}

        {/* Event info overlay */}
        <div
          style={styles.fullpage.overlay}
          onClick={isModalMode ? onClose : undefined}
        >
          <div
            style={styles.card}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Date display in right corner with click interaction */}
            <div
              style={{
                ...styles.eventDateBadge
              }}
              onClick={toggleEndTimeDisplay}
              title={event.end_time ? "Cliquer pour changer de date" : ""}
            >
              <div style={styles.dayName}>{getDayName(showEndTime && event.end_time ? event.end_time : event.start_time)}</div>
              <div style={styles.dateTimeCompact}>
                {showEndTime && event.end_time ? (
                  formatDateOnly(event.end_time)
                ) : (
                  formatDateOnly(event.start_time)
                )}
              </div>
              {/* Time display removed - only showing day and date */}
            </div>

            <h2 style={styles.title}>{event.title}</h2>


            {
              // Full event view
              <>
                <div style={styles.details}>
                  {event.address?.address_line && (
                    <div
                      style={{
                        ...styles.addressItem,
                        color: addressHovered ? "#2196F3" : "inherit"
                      }}
                      onClick={openGoogleMaps}
                      onMouseEnter={() => setAddressHovered(true)}
                      onMouseLeave={() => setAddressHovered(false)}
                    >
                      <FaMapMarkerAlt style={{
                        ...styles.detailIcon,
                        color: addressHovered ? "#2196F3" : "#40916c"
                      }} />
                      <span> {event.address.address_line}</span>
                    </div>
                  )}


                  {/* Participants */}
                  {event.circles && event.circles.length > 0 && (
                    <div style={styles.participantsRow}>
                      <div style={{
                        ...styles.detailIcon,
                        marginRight: "8px",
                        width: "12px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "2px solid #40916c",
                        backgroundColor: "transparent"
                      }} />
                      <div style={styles.circlesContainer}>
                        {event.circles.map((circle, index) => (
                          <div
                            key={index}
                            style={styles.circle}
                            onClick={() => handleViewCircleMembers(circle)}
                          >
                            <FaUserFriends style={styles.circleIcon} />
                            <span>{circle.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Description preview - inspired by EventCard */}
                {event.description && (
                  <div style={{
                    marginTop: "8px",
                    marginBottom: "16px",
                    padding: "14px 16px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "10px",
                    border: "1px solid #eee",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <FaInfoCircle style={{ color: "#2d6a4f" }} />
                      <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#2d2d2d" }}>Description</span>
                    </div>
                    <div>
                      {getDescriptionPreviewParagraphs(event.description).map((para, idx) => (
                        <div key={idx} style={{
                          margin: idx === 0 ? '0 0 10px 0' : '10px 0 0 0',
                          fontSize: '0.95rem',
                          lineHeight: 1.5,
                          color: '#333',
                          whiteSpace: 'pre-line'
                        }}>{para}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom buttons - share link and view members on left, participate on right */}
                <div style={styles.bottomButtons}>
                  {/* Left side buttons - share link and view members */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {/* Share link button - only show if can't generate invite */}
                    {!canGenerateInvite && (
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={handleShareEvent}
                          style={shareButtonClicked ? styles.shareButtonClicked : styles.shareButton}
                          title="Copier lien interne"
                        >
                          <FaLink style={{ 
                            color: shareButtonClicked ? "white" : "inherit",
                            ...styles.shareButtonIcon
                          }} />
                        </button>
                        {urlCopied && (
                          <div style={styles.copiedTooltip}>
                            Lien copié !
                          </div>
                        )}
                      </div>
                    )}


                    {/* Invitation link section */}
                    {canGenerateInvite && (
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!invitationUrl) {
                              handleGenerateInvite();
                            } else {
                              handleCopyInviteLink();
                            }
                          }}
                          style={invitationButtonClicked ? styles.shareButtonClicked : styles.shareButton}
                          title={!invitationUrl ? "Générer un lien d'invitation" : "Cliquer pour copier le lien d'invitation"}
                        >
                          <FaPaperPlane style={{ 
                            color: invitationButtonClicked ? "white" : "inherit",
                            ...styles.shareButtonIcon
                          }} />
                        </button>
                        {invitationCopied && (
                          <div style={styles.copiedTooltip}>
                            Lien d'invitation copié !
                          </div>
                        )}
                        {invitationError && (
                          <div style={styles.errorTooltip}>
                            {invitationError}
                          </div>
                        )}
                      </div>
                    )}

                    {/* View members button - blue like in EventCard */}
                    {event.circles && event.circles.length > 0 && (
                      <button
                        onClick={handleViewAllCircleMembers}
                        style={{
                          ...styles.shareButton,
                          backgroundColor: "#e3f2fd",
                          color: "#2196F3"
                        }}
                        title="Participants"
                      >
                        <FaUsers style={styles.shareButtonIcon} />
                      </button>
                    )}

                    {/* See more button - go to project page */}
                    <button
                      onClick={handleSeeMore}
                      style={styles.shareButton}
                      title="Plus d'informations"
                    >
                      <FaInfoCircle style={styles.shareButtonIcon} />
                    </button>
                  </div>

                  {/* Show share error as popup if present */}
                  {shareError && (
                    <div style={styles.shareLinkErrorPopup}>
                      {shareError}
                    </div>
                  )}

                  {/* Login button for non-connected users */}
                  {!isConnected && (
                    <button
                      style={{...styles.button, ...styles.primaryButton}}
                      onClick={handleLogin}
                    >
                      Log in to participate
                    </button>
                  )}
                </div>

                {/* View on map button - only show for direct link access, not modal mode */}
                {!isModalMode && (
                  <div style={{
                    position: "absolute",
                    bottom: "20px",
                    right: "20px"
                  }}>
                    <button
                      style={{
                        ...styles.button,
                        ...styles.secondaryButton,
                        padding: "8px 12px",
                        fontSize: "0.9rem"
                      }}
                      onClick={handleViewOnMap}
                    >
                      View on Map
                    </button>
                  </div>
                )}
              </>
            }
          </div>
        </div>

        {/* Circle Members Popup */}
        {showCircleMembers && (
          <CircleMembersPopup
            circleIds={selectedCircleIds}
            circleName={selectedCircleName}
            onClose={() => setShowCircleMembers(false)}
          />
        )}

        {/* Event Details Section */}
        {showEventDetails && event && (
          <EventDetailsSection
            event={event}
            isOpen={showEventDetails}
            onClose={() => setShowEventDetails(false)}
            onViewCircleMembers={(circleId, circleName) => {
              setSelectedCircleIds([circleId]);
              setSelectedCircleName(circleName);
              setShowCircleMembers(true);
            }}
          />
        )}
      </div>
    );
  } else {
    // Modal view
    return (
      <div style={styles.modal.overlay}>
        <div style={styles.card}>
          {/* Date display in right corner with click interaction */}
          <div
            style={{
              ...styles.eventDateBadge
            }}
            onClick={toggleEndTimeDisplay}
            title={event.end_time ? "Cliquer pour changer de date" : ""}
          >
            <div style={styles.dayName}>{getDayName(showEndTime && event.end_time ? event.end_time : event.start_time)}</div>
            <div style={styles.dateTimeCompact}>
              {showEndTime && event.end_time ? (
                formatDateOnly(event.end_time)
              ) : (
                formatDateOnly(event.start_time)
              )}
            </div>
            {/* Time display removed - only showing day and date */}
          </div>

          <h2 style={styles.title}>{event.title}</h2>

          {
            // Full event view
            <>
              <div style={styles.details}>
                {event.address?.address_line && (
                  <div
                    style={{
                      ...styles.addressItem,
                      color: addressHovered ? "#2196F3" : "inherit"
                    }}
                    onClick={openGoogleMaps}
                    onMouseEnter={() => setAddressHovered(true)}
                    onMouseLeave={() => setAddressHovered(false)}
                  >
                    <FaMapMarkerAlt style={{
                      ...styles.detailIcon,
                      color: addressHovered ? "#2196F3" : "#40916c"
                    }} />
                    <span>{event.address.address_line}</span>
                  </div>
                )}


                {/* Participants */}
                {event.circles && event.circles.length > 0 && (
                  <div style={styles.participantsRow}>
                    <div style={{
                      ...styles.detailIcon,
                      marginRight: "8px",
                      width: "12px",
                      height: "18px",
                      borderRadius: "50%",
                      border: "2px solid #40916c",
                      backgroundColor: "transparent"
                    }} />
                    <div style={styles.circlesContainer}>
                      {event.circles.map((circle, index) => (
                        <div
                          key={index}
                          style={styles.circle}
                          onClick={() => handleViewCircleMembers(circle)}
                        >
                          <FaUserFriends style={styles.circleIcon} />
                          <span>{circle.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Description preview - inspired by EventCard */}
              {event.description && (
                <div style={{
                  marginTop: "8px",
                  marginBottom: "16px",
                  padding: "14px 16px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "10px",
                  border: "1px solid #eee",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <FaInfoCircle style={{ color: "#2d6a4f" }} />
                    <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#2d2d2d" }}>Description</span>
                  </div>
                  <div>
                    {getDescriptionPreviewParagraphs(event.description).map((para, idx) => (
                      <div key={idx} style={{
                        margin: idx === 0 ? '0 0 10px 0' : '10px 0 0 0',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        color: '#333',
                        whiteSpace: 'pre-line'
                      }}>{para}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom buttons - share link and view members on left, participate on right */}
              <div style={styles.bottomButtons}>
                {/* Left side buttons - share link and view members */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {/* Share link button - only show if can't generate invite */}
                  {!canGenerateInvite && (
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={handleShareEvent}
                        style={shareButtonClicked ? styles.shareButtonClicked : styles.shareButton}
                        title="Copier lien interne"
                      >
                        <FaLink style={{ 
                          color: shareButtonClicked ? "white" : "inherit",
                          ...styles.shareButtonIcon
                        }} />
                      </button>
                      {urlCopied && (
                        <div style={styles.copiedTooltip}>
                          Lien copié !
                        </div>
                      )}
                    </div>
                  )}


                  {/* Invitation link section */}
                  {canGenerateInvite && (
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={(e) => {
                          console.log("EventView: Modal Button clicked!");
                          e.preventDefault();
                          e.stopPropagation();
                          if (!invitationUrl) {
                            handleGenerateInvite();
                          } else {
                            handleCopyInviteLink();
                          }
                        }}
                        style={invitationButtonClicked ? styles.shareButtonClicked : styles.shareButton}
                        title={!invitationUrl ? "Générer un lien d'invitation" : "Cliquer pour copier le lien d'invitation"}
                      >
                        <FaPaperPlane style={{ 
                          color: invitationButtonClicked ? "white" : "inherit",
                          ...styles.shareButtonIcon
                        }} />
                      </button>
                      {invitationCopied && (
                        <div style={styles.copiedTooltip}>
                          Lien d'invitation copié !
                        </div>
                      )}
                      {invitationError && (
                        <div style={styles.errorTooltip}>
                          {invitationError}
                        </div>
                      )}
                    </div>
                  )}

                  {/* View members button - blue like in EventCard */}
                  {event.circles && event.circles.length > 0 && (
                    <button
                      onClick={handleViewAllCircleMembers}
                      style={{
                        ...styles.shareButton,
                        backgroundColor: "#e3f2fd",
                        color: "#2196F3"
                      }}
                      title="Participants"
                    >
                      <FaUsers style={styles.shareButtonIcon} />
                    </button>
                  )}

                  {/* See more button - go to project page */}
                  <button
                    onClick={handleSeeMore}
                    style={styles.shareButton}
                    title="Plus d'informations"
                  >
                    <FaInfoCircle style={styles.shareButtonIcon} />
                  </button>
                </div>

                {/* Show share error as popup if present */}
                {shareError && (
                  <div style={styles.shareLinkErrorPopup}>
                    {shareError}
                  </div>
                )}

              </div>

              {/* Close button */}
              <div style={{display: "flex", justifyContent: "center", marginTop: "15px"}}>
                <button
                  type="button"
                  style={{...styles.button, ...styles.secondaryButton}}
                  onClick={onClose || handleViewOnMap}
                >
                  Close
                </button>
              </div>
            </>
          }
        </div>

        {/* Circle Members Popup */}
        {showCircleMembers && (
          <CircleMembersPopup
            circleIds={selectedCircleIds}
            circleName={selectedCircleName}
            onClose={() => setShowCircleMembers(false)}
          />
        )}

        {/* Event Details Section */}
        {showEventDetails && event && (
          <EventDetailsSection
            event={event}
            isOpen={showEventDetails}
            onClose={() => setShowEventDetails(false)}
            onViewCircleMembers={(circleId, circleName) => {
              setSelectedCircleIds([circleId]);
              setSelectedCircleName(circleName);
              setShowCircleMembers(true);
            }}
          />
        )}
      </div>
    );
  }
};

export default EventView;
