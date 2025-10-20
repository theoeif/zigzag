import React, { useState } from 'react';
import {
  FaTrashAlt, FaEdit, FaMapMarkerAlt, FaClock,
  FaUser, FaChevronUp, FaChevronDown, FaCalendarPlus,
  FaLink, FaUsers, FaUserFriends, FaCalendarAlt, FaDirections,
  FaCaretDown, FaCaretRight, FaInfoCircle
} from "react-icons/fa";
import styles from './Project.module.css';
import EventDetailsSection from './EventDetailsSection';
import { downloadSingleEventICal } from '../../api/api';

const EventCard = ({ event, isManageMode, onDelete, onEdit, onViewCircleMembers, onDetailsToggle, autoOpen = false, onAutoOpened }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);

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
    return date.toLocaleDateString('fr-FR', { weekday: 'short' });
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
      if (event.shareable_link === false) {
        alert("L'hôte a désactivé le partage de lien pour cet événement");
        return;
      }
      const shareUrl = event.public_link || `http://localhost:5173/event/${event.id}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Lien copié");
    } catch (error) {
      console.error("Error copying share link:", error);
      alert("Échec de la copie du lien. Veuillez réessayer.");
    }
  };

  // Add event to calendar by downloading iCal file
  const handleAddToCalendar = async () => {
    try {
      // Download the iCal file for this specific event only
      await downloadSingleEventICal(event);

      // Show success message
      alert("À ouvrir dans votre calendrier !");
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      alert("Erreur lors de l'ajout au calendrier. Veuillez réessayer.");
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
    onViewCircleMembers(allCircleIds, "Participants");
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
    return timeText ? timeText : "Toute la journée";
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
      const addressText = event.address?.address_line || "Emplacement de l'événement";

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
      const address = event.address?.address_line || "Emplacement non disponible";
      const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(googleMapsSearchUrl, '_blank');
    }
  };

  // Toggle circles dropdown visibility
  const toggleCirclesDropdown = () => {
    setShowCirclesDropdown(!showCirclesDropdown);
  };


  // Add console log to debug details toggle
  const toggleDetails = () => {
    const newShowDetails = !showDetails;
    setShowDetails(newShowDetails);
    // Notify parent component about details expansion state
    if (onDetailsToggle) {
      onDetailsToggle(newShowDetails);
    }
  };

  // Auto-open details when requested by parent
  React.useEffect(() => {
    if (autoOpen && !showDetails) {
      setShowDetails(true);
      if (onDetailsToggle) onDetailsToggle(true);
      if (onAutoOpened) onAutoOpened();
    }
  }, [autoOpen, showDetails, event.id, event.title, onDetailsToggle, onAutoOpened]);

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
        {/* Time display removed - only showing day and date */}
      </div>

      {/* Content section */}
      <div style={{ flex: 1 }}>
        {/* Event title and quick info */}
        <div className={styles.eventMainInfoProject}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h3 className={styles.eventTitleProject}>{event.title}</h3>
            {event.event_shared && (
              <span
                className={styles.sharedEventBadgeProject}
                title="Événement partagé - tous les membres des cercles peuvent modifier la date et la description"
                style={{
                  backgroundColor: '#40916c',
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Partagé
              </span>
            )}
          </div>

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

          {/* Show description preview in main view */}
          {event.description && (
            <div className={styles.descriptionPreviewProject}>
              <p>{getDescriptionExcerpt(event.description)}</p>
            </div>
          )}

          {/* Render tags in main view */}
          <div className={styles.tagsSectionProject}>
            {renderTags()}
          </div>

          {/* Removed Invited Circles section */}

        </div>

        {/* Manage mode buttons - positioned at bottom left */}
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
            onClick={handleAddToCalendar}
          >
            <FaCalendarPlus />
          </button>
          {/* Removed WhatsApp group button */}
        </div>

        {/* Simple details button moved to bottom of card */}
        <div className={styles.simpleDetailsButtonContainer}>
          <button
            className={styles.simpleDetailsButtonProject}
            onClick={toggleDetails}
            aria-label={showDetails ? "Hide details" : "Show details"}
          >
            <FaInfoCircle /> Détails {showDetails ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>
      </div>

      {/* Event Details Section */}
      <EventDetailsSection
        event={event}
        isOpen={showDetails}
        onClose={toggleDetails}
        onViewCircleMembers={onViewCircleMembers}
      />
    </div>
  );
};

export default EventCard;
