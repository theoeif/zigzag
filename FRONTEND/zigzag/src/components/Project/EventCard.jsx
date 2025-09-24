import React, { useState } from 'react';
import { 
  FaTrashAlt, FaEdit, FaMapMarkerAlt, FaClock, FaWhatsapp, 
  FaGlobe, FaUser, FaChevronUp, FaChevronDown, FaCalendarPlus, 
  FaLink, FaUsers, FaUserFriends, FaCalendarAlt, FaDirections,
  FaCaretDown, FaCaretRight, FaCheck, FaPlusCircle, FaInfoCircle,
  FaUserPlus
} from "react-icons/fa";
import styles from './Project.module.css';
import { toggleEventParticipation, generateEventShareToken } from '../../api/api';

const EventCard = ({ event, isManageMode, onDelete, onEdit, onViewCircleMembers, onParticipationToggled }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showCirclesDropdown, setShowCirclesDropdown] = useState(false);
  const [isParticipating, setIsParticipating] = useState(event.is_participating || false);
  const [participantsCount, setParticipantsCount] = useState(event.participants_count || 0);
  const [isUpdatingParticipation, setIsUpdatingParticipation] = useState(false);
  
  // Format date to a readable format (date only without time)
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
  
  // Format date including the year, conditionally showing time
  const formatFullDate = (dateString) => {
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

  // Format date to a readable format (keeping for backward compatibility)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Base format without time
    const dateFormat = {
      month: 'short',
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
  
  // Get day name
  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Toggle between showing start date and end date
  const toggleDateDisplay = () => {
    if (event.end_time) {
      setShowEndDate(!showEndDate);
    }
  };

  // Create a short excerpt of the description
  const getDescriptionExcerpt = (description) => {
    if (!description) return "";
    return description.length > 80 ? `${description.substring(0, 80)}...` : description;
  };

  // Copy event link to clipboard
  const shareEventLink = async () => {
    try {
      // Check if event links are shareable
      if (event.shareable_link === false) {
        alert("The host has disabled link sharing for this event");
        return;
      }
      
      // If a public link already exists, use it, otherwise generate a new token
      if (event.public_link) {
        let shareUrl = event.public_link;
        
        // Check if we need to add a token for private events
        if (!event.is_public) {
          // Generate a share token for this event
          const tokenResponse = await generateEventShareToken(event.id);
          if (tokenResponse && tokenResponse.token) {
            // Add the token as a query parameter
            shareUrl = `${event.public_link}?invite=${tokenResponse.token}`;
          }
        }
        
        // Copy the URL to clipboard
        navigator.clipboard.writeText(shareUrl);
        alert("Event link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error generating share link:", error);
      alert("Failed to generate share link. Please try again.");
    }
  };

  // Helper function to extract circles data from different formats
  const extractCircleIds = (eventCircles) => {
    if (!eventCircles) return [];
    
    // Initialize array to store circle IDs
    let circleIds = [];
    
    // Handle different data structures
    if (Array.isArray(eventCircles)) {
      // If it's an array of objects with id property
      if (eventCircles.length > 0 && typeof eventCircles[0] === 'object') {
        circleIds = eventCircles.map(circle => circle.id).filter(Boolean);
      } 
      // If it's an array of primitive IDs
      else {
        circleIds = eventCircles.filter(id => id);
      }
    } 
    // If it's an object with keys as IDs or keys pointing to objects with IDs
    else if (typeof eventCircles === 'object') {
      Object.entries(eventCircles).forEach(([key, value]) => {
        if (typeof value === 'object' && value.id) {
          circleIds.push(value.id);
        } else if (!isNaN(key)) {
          // If key is numeric, it might be the ID itself
          circleIds.push(parseInt(key));
        }
      });
    }
    
    return circleIds;
  };

  // Function to handle viewing all circle members for an event
  const handleViewAllCircleMembers = (event, onViewCircleMembers) => {
    if (!event) {
      console.error("EventCard: Cannot view members - event data is missing");
      return;
    }
    
    // Extract all circle IDs associated with this event
    const allCircleIds = extractCircleIds(event.circles);
    
    if (allCircleIds.length === 0) {
      console.error("EventCard: No circle IDs found for this event");
      return;
    }
        
    // Pass all circle IDs to the parent handler
    onViewCircleMembers(allCircleIds, "Project Attendees");
  };

  // Helper to safely render circles
  const renderCircles = () => {
    // Simplified function that directly uses the enhanced circle data from the API
    if (!event.circles || !Array.isArray(event.circles)) {
      return [];
    }
    
    // Now the circles data should already have id and name properties
    return event.circles.map(circle => ({
      id: circle.id,
      name: circle.name || `Circle ${circle.id}`
    }));
  };

  // Handler to view circle members
  const handleViewCircleMembers = (circle) => {
    if (!circle || (!circle.id && circle.id !== 0)) {
      console.error("EventCard: Invalid circle data:", circle);
      return;
    }
    
    console.log("EventCard: Viewing circle members for circle:", circle);
    
    // Make sure we have valid data
    const circleId = circle.id;
    const circleName = circle.name || `Circle ${circleId}`;
    
    // Only proceed if we have an ID
    if (circleId !== undefined && circleId !== null) {
      console.log(`EventCard: Passing circleId=${circleId}, circleName=${circleName} to parent`);
      onViewCircleMembers && onViewCircleMembers(circleId, circleName);
    } else {
      console.error("EventCard: Missing circle ID:", circle);
    }
  };

  // Get circle data
  const circleData = renderCircles();
  const hasCircles = circleData.length > 0;

  // Helper to render tags/categories if available
  const renderTags = () => {
    if (!event.categories || (Array.isArray(event.categories) && event.categories.length === 0)) {
      return null;
    }

    let tagsData = [];
    if (Array.isArray(event.categories)) {
      tagsData = event.categories;
    } else if (typeof event.categories === 'object' && event.categories !== null) {
      tagsData = Object.values(event.categories);
    }

    if (tagsData.length === 0) return null;

    return (
      <div className={styles.tagsContainerProject}>
        {tagsData.map((tag, index) => (
          <span key={index} className={styles.eventTagProject}>
            {typeof tag === 'string' ? tag : tag.name || `Tag ${index + 1}`}
          </span>
        ))}
      </div>
    );
  };

  // Get time display text, accounting for empty time
  const getTimeDisplay = (dateString) => {
    const timeText = formatTimeOnly(dateString);
    return timeText ? timeText : "All day";
  };

  // Function to open Google Maps directly, preferably in the native app if installed
  const openGoogleMaps = (e) => {
    e.preventDefault();
    
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
      const addressText = event.address?.address_line || "Event location";
      
      // Check if we're on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Prepare URL schemes for different platforms
        // Google Maps app URL scheme for both iOS and Android
        const googleMapsAppUrl = `comgooglemaps://?q=${latitude},${longitude}&center=${latitude},${longitude}`;
        
        // Universal URL that opens in browser if app is not installed
        const googleMapsWebUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        
        // First try to open the Google Maps app
        // Create a hidden iframe to try to launch the app
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = googleMapsAppUrl;
        
        // Append to body to attempt to open the app
        document.body.appendChild(iframe);
        
        // Set timeout to remove iframe and open web URL if app doesn't open
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.location.href = googleMapsWebUrl;
        }, 500);
      } else {
        // On desktop, just open in browser
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        window.open(googleMapsUrl, '_blank');
      }
    } else {
      // If coordinates are not available, try to search by address
      const address = event.address?.address_line || "Location not available";
      const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(googleMapsSearchUrl, '_blank');
    }
  };

  // Toggle circles dropdown visibility
  const toggleCirclesDropdown = () => {
    setShowCirclesDropdown(!showCirclesDropdown);
  };

  // Handle toggling participation
  const handleToggleParticipation = async (e) => {
    e.stopPropagation(); // Prevent event bubbling
    
    if (isUpdatingParticipation) return; // Prevent multiple clicks
    
    try {
      setIsUpdatingParticipation(true);
      const response = await toggleEventParticipation(event.id);
      
      setIsParticipating(response.participating);
      setParticipantsCount(response.count);
      
      // Call parent handler if provided
      if (onParticipationToggled) {
        onParticipationToggled(event.id, response.participating, response.count);
      }
    } catch (error) {
      console.error("Error toggling participation:", error);
      // Display error message if needed
    } finally {
      setIsUpdatingParticipation(false);
    }
  };

  // Add console log to debug details toggle
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <div className={styles.eventCardProject} style={{ 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      minHeight: '280px' // Set a minimum height for all cards
    }}>
      {/* Date display in right corner with click interaction - more compact version */}
      <div 
        className={`${styles.eventDateBadgeProject} ${event.end_time ? styles.clickableDateBadgeProject : ''}`}
        onClick={toggleDateDisplay}
        title={event.end_time ? "Click to toggle date" : ""}
      >
        <div className={styles.dayNameProject}>{getDayName(showEndDate && event.end_time ? event.end_time : event.start_time)}</div>
        <div className={styles.dateTimeCompactProject}>
          {showEndDate && event.end_time ? (
            formatDateOnly(event.end_time)
          ) : (
            formatDateOnly(event.start_time)
          )}
        </div>
        <div className={styles.timeCompactProject}>
          {formatTimeOnly(showEndDate && event.end_time ? event.end_time : event.start_time)}
        </div>
      </div>
      
      {/* Content section */}
      <div style={{ flex: 1 }}>
        {/* Event title and quick info */}
        <div className={styles.eventMainInfoProject}>
          <h3 className={styles.eventTitleProject}>{event.title}</h3>
          
          {/* Location with icon - NOW CLICKABLE */}
          {event.address && (
            <div className={styles.eventLocationProject} onClick={openGoogleMaps}>
              <div className={styles.locationLinkProject}>
                <span className={styles.locationIconProject}><FaMapMarkerAlt /></span>
                <span className={styles.locationTextProject}>{event.address.address_line}</span>
                <FaDirections className={styles.directionsIconProject} />
              </div>
            </div>
          )}
          
          {/* Render only tags in main view, not circles */}
          <div className={styles.tagsSectionProject}>
            {renderTags()}
          </div>
          
          {/* Display participation count and toggle button together in a minimalist design */}
          <div className={styles.participationInfoProject}>
            <span className={styles.participantsCountProject} title="Number of participants">
              <FaUsers /> {participantsCount}
            </span>
            
            {/* Minimalist participation toggle button */}
            <button
              onClick={handleToggleParticipation}
              className={`${styles.minimalParticipationButtonProject} ${isParticipating ? styles.participatingProject : ''}`}
              disabled={isUpdatingParticipation}
              aria-label={isParticipating ? "Cancel participation" : "Participate"}
              title={isParticipating ? "Cancel participation" : "Participate (+1)"}
            >
              {isUpdatingParticipation ? (
                "..."
              ) : isParticipating ? (
                <FaCheck />
              ) : (
                <FaPlusCircle />
              )}
            </button>
          </div>
        </div>
        
        {/* Manage mode buttons */}
        {isManageMode && (
          <div className={styles.manageButtonsGroupProject}>
            <button 
              className={styles.editButtonProject}
              onClick={() => onEdit && onEdit(event)}
              aria-label="Edit event"
              title="Edit event"
            >
              <FaEdit />
            </button>
            <button 
              className={styles.deleteButtonProject}
              onClick={() => onDelete && onDelete(event.id)}
              aria-label="Delete event"
              title="Delete event"
            >
              <FaTrashAlt />
            </button>
          </div>
        )}
      </div>
      
      {/* Fixed position footer section with action buttons */}
      <div style={{ marginTop: 'auto' }}>
        {/* Action buttons with View Participants on the left */}
        <div className={styles.eventActionsProject} style={{ 
          marginBottom: '10px',
          borderTop: '1px solid #eee',
          paddingTop: '10px'
        }}>
          {/* View Invited button - conditionally shown if there are circles */}
          {hasCircles && (
            <button 
              onClick={() => handleViewAllCircleMembers(event, onViewCircleMembers)}
              className={styles.participantsButtonProject}
              aria-label="View invited"
              title="View invited"
            >
              <FaUserFriends />
            </button>
          )}
          
          <div className={styles.actionButtonsSpacerProject}></div>
          
          {/* Only show share button if sharing is allowed */}
          {(event.shareable_link === undefined || event.shareable_link === true) && (
            <button 
              className={styles.actionButtonProject} 
              aria-label="Share event link" 
              onClick={shareEventLink}
              title="Copy event link"
            >
              <FaLink />
            </button>
          )}
          
          <button 
            className={styles.actionButtonProject} 
            aria-label="Add to calendar" 
            title="Add to calendar"
          >
            <FaCalendarPlus />
          </button>
          <button 
            className={styles.actionButtonProject} 
            aria-label="WhatsApp group" 
            title="WhatsApp group"
            onClick={() => {
              if (event.whatsapp_group_link) {
                window.open(event.whatsapp_group_link, '_blank');
              } else {
                alert("No WhatsApp group available for this event");
              }
            }}
          >
            <FaWhatsapp />
          </button>
        </div>
        
        {/* Simple details button moved to bottom of card */}
        <div className={styles.simpleDetailsButtonContainer}>
          <button 
            className={styles.simpleDetailsButtonProject}
            onClick={toggleDetails}
            aria-label={showDetails ? "Hide details" : "Show details"}
          >
            <FaInfoCircle /> Details {showDetails ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>
      </div>
      
      {/* Expanded details section - Position as an overlay */}
      {showDetails && (
        <div 
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            padding: '0',
            width: '80%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
        >
          <div 
            className={styles.popupHeaderProjectEnhanced}
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'white',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px 20px',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}
          >
            <div className={styles.popupTitleWrapper}>
              <h3 className={styles.modalTitleProject}>Project Details: {event.title}</h3>
            </div>
            <button onClick={toggleDetails} className={styles.closeButtonProjectEnhanced}>
              ✕
            </button>
          </div>
          
          <div style={{ padding: '20px' }}>
            {/* Location with map */}
            {event.address && event.address.latitude && event.address.longitude && (
              <div style={{
                marginBottom: '15px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #ddd'
              }}>
                <div style={{ 
                  height: '150px', 
                  backgroundColor: '#f5f5f5', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }} onClick={openGoogleMaps}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px'
                  }}>
                    <FaMapMarkerAlt style={{ fontSize: '32px', color: '#e63946', marginBottom: '8px' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {event.address.address_line}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        Click to open in Maps
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className={styles.fullDescriptionProject}>
              <strong>Description</strong>
              <p>{event.description || "No description provided for this event."}</p>
            </div>
            
            {/* Additional details with icons */}
            <div className={styles.detailsGridProject}>
              <div className={styles.detailItemProject}>
                <FaCalendarAlt />
                <span><strong>Start:</strong> {formatFullDate(event.start_time)}</span>
              </div>
              
              {event.end_time && (
                <div className={styles.detailItemProject}>
                  <FaClock />
                  <span><strong>End:</strong> {formatFullDate(event.end_time)}</span>
                </div>
              )}
              
              {event.whatsapp_group_link && (
                <div className={styles.detailItemProject}>
                  <FaWhatsapp />
                  <a href={event.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                    Join WhatsApp Group
                  </a>
                </div>
              )}
              
              {event.is_public && (
                <div className={styles.detailItemProject}>
                  <FaGlobe />
                  <span>This is public</span>
                </div>
              )}
              
              {event.friends_of_friends_allowed && (
                <div className={styles.detailItemProject}>
                  <FaUserPlus />
                  <span>Friends of friends allowed</span>
                </div>
              )}
              
              {event.creator && (
                <div className={styles.detailItemProject}>
                  <FaUser />
                  <span><strong>Organizer:</strong> {typeof event.creator === 'string' ? event.creator : event.creator.username}</span>
                </div>
              )}
            </div>
            
            {/* Show all circles/tags when expanded - NOW WITH IMPROVED CIRCLES DISPLAY */}
            <div className={styles.allCirclesSectionProject}>
              {hasCircles && (
                <div className={styles.allCirclesProject}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '5px'
                  }}>
                    <h4 style={{ margin: '5px 0', fontSize: '1rem' }}>Circles and Invited:</h4>
                    <span style={{ 
                      color: '#666', 
                      fontSize: '0.9rem',
                      backgroundColor: '#f0f0f0',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      {circleData.length} {circleData.length === 1 ? 'circle' : 'circles'}
                    </span>
                  </div>
                  
                  {/* Control how many circles to display */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    margin: '10px 0'
                  }}>
                    {/* Display either first 3 circles or all circles based on showCirclesDropdown */}
                    {(showCirclesDropdown ? circleData : circleData.slice(0, 3)).map((circle, index) => (
                      <div 
                        key={index} 
                        onClick={() => handleViewCircleMembers(circle)}
                        style={{
                          backgroundColor: '#f0f7f4',
                          borderRadius: '16px',
                          padding: '4px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        <FaUsers style={{ fontSize: '0.8rem', color: '#2d6a4f' }} />
                        <span>{circle.name || `Circle ${circle.id}`}</span>
                      </div>
                    ))}
                    
                    {/* Show/hide more circles button */}
                    {!showCirclesDropdown && circleData.length > 3 && (
                      <div 
                        style={{
                          backgroundColor: '#f0f7f4',
                          borderRadius: '16px',
                          padding: '4px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                        onClick={() => setShowCirclesDropdown(true)}
                      >
                        +{circleData.length - 3} more
                      </div>
                    )}
                    
                    {/* Show less button when expanded */}
                    {showCirclesDropdown && circleData.length > 3 && (
                      <div 
                        style={{
                          backgroundColor: '#f0f7f4',
                          borderRadius: '16px',
                          padding: '4px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                        onClick={() => setShowCirclesDropdown(false)}
                      >
                        Show less
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {event.categories && event.categories.length > 0 && (
                <div className={styles.allTagsProject}>
                  <h4>Tags:</h4>
                  <div className={styles.tagsGridProject}>
                    {renderTags()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCard; 