import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthProvider";
import { 
  fetchDirectEvent, 
  acceptInvitation, 
  createEventInvitation
} from "../../../api/api";
import MarkersMap from "../../MarkersMap";
import CircleMembersPopup from "../../Project/CircleMembersPopup";
import { 
  FaMapMarkerAlt,
  FaUser,
  FaLink,
  FaUsers,
  FaUserFriends,
  // See more icon to navigate to project page
  FaInfoCircle
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
  invitationBanner: {
    backgroundColor: "#e3f2fd",
    borderRadius: "4px",
    padding: "10px",
    marginBottom: "15px",
    borderLeft: "4px solid #2196F3",
    fontSize: "0.9rem"
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
    width: "36px",
    height: "36px",
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
    width: "36px",
    height: "36px",
    backgroundColor: "#40916c",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.3s ease",
    transform: "scale(1.1)",
    boxShadow: "0 0 10px rgba(64, 145, 108, 0.5)",
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
  const inviteToken = searchParams.get('invite');
  const { isConnected } = useContext(AuthContext);
  
  // State
  const [event, setEvent] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [showEndTime, setShowEndTime] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [shareButtonClicked, setShareButtonClicked] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [addressHovered, setAddressHovered] = useState(false);
  
  // Circle members popup state
  const [showCircleMembers, setShowCircleMembers] = useState(false);
  const [selectedCircleIds, setSelectedCircleIds] = useState([]);
  const [selectedCircleName, setSelectedCircleName] = useState('');
  
  // Sharing and invitations
  const [isCreator, setIsCreator] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  
  // Invitation verification removed as public/private distinction is no longer used
  
  // Fetch event data
  useEffect(() => {
    if (!initialData) {
      const loadEvent = async () => {
        try {
          setLoading(true);
          const eventData = await fetchDirectEvent(eventId, inviteToken);
          setEvent(eventData);
          
          
          // Check if current user is the creator
          const currentUsername = localStorage.getItem("username");
          setIsCreator(eventData.creator === currentUsername);
          
          // Set share URL
          setShareUrl(`http://localhost:5173/event/${eventId}`);
          setError(null);
        } catch (err) {
          console.error("Error loading event:", err);
          setError("Could not load this event.");
        } finally {
          setLoading(false);
        }
      };
      
      loadEvent();
    } else {
      // Initialize with provided data
      setEvent(initialData);
      const currentUsername = localStorage.getItem("username");
      setIsCreator(initialData.creator === currentUsername);
      setShareUrl(`http://localhost:5173/event/${eventId}`);
      setLoading(false);
    }
  }, [eventId, inviteToken, isConnected, initialData]);

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
    navigate('/events', { state: { openEventId: eventId } });
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
    // Normalize and inject spacing similar to EventCard expectations
    let text = String(description).replace(/\r\n/g, '\n').trim();
    // Insert blank lines after headings ending with ':'
    text = text.replace(/:\s*/g, ':\n\n');
    // Collapse 3+ newlines to double newlines
    text = text.replace(/\n{3,}/g, '\n\n');

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
    navigate(`/login?redirect=${encodeURIComponent(`/event/${eventId}${inviteToken ? `?invite=${inviteToken}` : ''}`)}`);
  };
  
  const handleAcceptInvitation = async () => {
    if (!isConnected) {
      handleLogin();
      return;
    }
    
    try {
      const result = await acceptInvitation(inviteToken);
      if (result.success) {
        // Reload the event data
        const eventData = await fetchDirectEvent(eventId, inviteToken);
        setEvent(eventData);
      }
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setError("Failed to accept invitation. Please try again.");
    }
  };
  
  
  const handleViewOnMap = () => {
    // Pass the event location as state to maintain zoom and center when navigating to map
    if (event && (
      (event.lat && event.lng) ||
      (event.address && event.address.latitude && event.address.longitude)
    )) {
      const lat = event.lat || (event.address && event.address.latitude);
      const lng = event.lng || (event.address && event.address.longitude);

      // If we have an original map state, use it as the base and update with event coordinates
      const mapState = originalMapState ? {
        ...originalMapState,
        center: { lat, lng },
        zoom: 15
      } : {
        center: { lat, lng },
        zoom: 15
      };

      navigate('/', {
        state: { mapState }
      });
    } else {
      navigate('/');
    }
  };
  
  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setInviteError("Please enter a valid email address");
      return;
    }
    
    try {
      setInviteError(null);
      await createEventInvitation(eventId, inviteEmail);
      setInviteSent(true);
      setInviteEmail('');
      setTimeout(() => setInviteSent(false), 3000); // Clear success message after 3 seconds
    } catch (err) {
      setInviteError('Failed to send invitation. Please try again.');
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
        setShareError("The host has disabled link sharing for this event");
        setTimeout(() => setShareError(null), 3000);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (error) {
      console.error("Error copying share link:", error);
      setShareError("Failed to copy link");
      setTimeout(() => setShareError(null), 3000);
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
      const address = event.address?.address_line || "Location not available";
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
    setSelectedCircleName("Project Attendees");
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
        {/* Map as background */}
        <div style={styles.fullpage.mapContainer}>
          <MarkersMap
            eventCoordinates={event ? {
              lat: event.lat || (event.address && event.address.latitude),
              lng: event.lng || (event.address && event.address.longitude)
            } : null}
          />
        </div>
        
        {/* Event info overlay */}
        <div style={styles.fullpage.overlay}>
          <div style={styles.card}>
            {/* Date display in right corner with click interaction */}
            <div 
              style={{
                ...styles.eventDateBadge
              }}
              onClick={toggleEndTimeDisplay}
              title={event.end_time ? "Click to toggle date" : ""}
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
            
            {/* Invitation banner */}
            {inviteToken && (
              <div style={styles.invitationBanner}>
                <p>You have been invited to this event. {!isConnected && "Please log in to accept the invitation."}</p>
              </div>
            )}
            
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
                      <span><strong>Where:</strong> {event.address.address_line}</span>
                    </div>
                  )}
                  
                  {event.creator && (
                    <div style={styles.detailItem}>
                      <FaUser style={styles.detailIcon} />
                      <span><strong>Host:</strong> {event.creator}</span>
                    </div>
                  )}
                  
                  {/* Public/private and friends-of-friends indicators removed */}
                  
                  {/* Participants */}
                  {event.circles && event.circles.length > 0 && (
                    <div>
                      <strong>Participants:</strong>
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
                        <p key={idx} style={{
                          margin: idx === 0 ? '0 0 10px 0' : '10px 0 0 0',
                          fontSize: '0.95rem',
                          lineHeight: 1.5,
                          color: '#333'
                        }}>{para}</p>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* WhatsApp link removed */}
                
                {/* Bottom buttons - share link and view members on left, participate on right */}
                <div style={styles.bottomButtons}>
                  {/* Left side buttons - share link and view members */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {/* Share link button */}
                    <div style={{ position: "relative" }}>
                    <button 
                      onClick={handleShareEvent} 
                      style={shareButtonClicked ? styles.shareButtonClicked : styles.shareButton}
                      title="Copy event link"
                    >
                      <FaLink style={{ color: shareButtonClicked ? "white" : "inherit" }} />
                    </button>
                {urlCopied && (
                  <div style={styles.copiedTooltip}>
                    Lien copié !
                  </div>
                )}
                    </div>
                    
                    {/* View members button - blue like in EventCard */}
                    {event.circles && event.circles.length > 0 && (
                      <button 
                        onClick={handleViewAllCircleMembers}
                        style={{
                          ...styles.shareButton,
                          backgroundColor: "#e3f2fd",
                          color: "#2196F3"
                        }}
                        title="View participants"
                      >
                        <FaUsers />
                      </button>
                    )}

                    {/* See more button - go to project page */}
                    <button
                      onClick={handleSeeMore}
                      style={styles.shareButton}
                      title="See more details"
                    >
                      <FaInfoCircle />
                    </button>
                  </div>
                  
                  {/* Show share error as popup if present */}
                  {shareError && (
                    <div style={styles.shareLinkErrorPopup}>
                      {shareError}
                    </div>
                  )}
                  
                  {/* Accept invitation button */}
                  {isConnected && inviteToken ? (
                    <button 
                      style={{...styles.button, ...styles.primaryButton}} 
                      onClick={handleAcceptInvitation}
                    >
                      Accept Invitation
                    </button>
                  ) : !isConnected ? (
                    <button 
                      style={{...styles.button, ...styles.primaryButton}} 
                      onClick={handleLogin}
                    >
                      Log in to participate
                    </button>
                  ) : null}
                </div>
                
                {/* View on map button */}
                <div style={{display: "flex", justifyContent: "center", marginTop: "15px"}}>
                  <button 
                    style={{...styles.button, ...styles.secondaryButton}} 
                    onClick={handleViewOnMap}
                  >
                    View on Map
                  </button>
                </div>
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
            title={event.end_time ? "Click to toggle date" : ""}
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
                
                {event.creator && (
                  <div style={styles.detailItem}>
                    <FaUser style={styles.detailIcon} />
                    <span><strong>Host:</strong> {event.creator}</span>
                  </div>
                )}
                
                {/* Public/private and friends-of-friends indicators removed */}
                
                {/* Participants */}
                {event.circles && event.circles.length > 0 && (
                  <div>
                    <strong>Participants:</strong>
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
                      <p key={idx} style={{
                        margin: idx === 0 ? '0 0 10px 0' : '10px 0 0 0',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        color: '#333'
                      }}>{para}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {/* WhatsApp link removed */}
              
              {/* Bottom buttons - share link and view members on left, participate on right */}
              <div style={styles.bottomButtons}>
                {/* Left side buttons - share link and view members */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {/* Share link button */}
                  <div style={{ position: "relative" }}>
                    <button 
                      onClick={handleShareEvent} 
                      style={shareButtonClicked ? styles.shareButtonClicked : styles.shareButton}
                      title="Copy event link"
                    >
                      <FaLink style={{ color: shareButtonClicked ? "white" : "inherit" }} />
                    </button>
                    {urlCopied && (
                      <div style={styles.copiedTooltip}>
                        Lien copié !
                      </div>
                    )}
                  </div>
                  
                  {/* View members button - blue like in EventCard */}
                  {event.circles && event.circles.length > 0 && (
                    <button 
                      onClick={handleViewAllCircleMembers}
                      style={{
                        ...styles.shareButton,
                        backgroundColor: "#e3f2fd",
                        color: "#2196F3"
                      }}
                      title="View participants"
                    >
                      <FaUsers />
                    </button>
                  )}

                  {/* See more button - go to project page */}
                  <button 
                    onClick={handleSeeMore}
                    style={styles.shareButton}
                    title="See more details"
                  >
                    <FaInfoCircle />
                  </button>
                </div>
                
                {/* Show share error as popup if present */}
                {shareError && (
                  <div style={styles.shareLinkErrorPopup}>
                    {shareError}
                  </div>
                )}
                
                {/* Accept invitation button */}
                {isConnected && inviteToken && (
                  <button
                    onClick={handleAcceptInvitation}
                    style={{...styles.button, ...styles.primaryButton}}
                  >
                    Accept Invitation
                  </button>
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
      </div>
    );
  }
};

export default EventView; 