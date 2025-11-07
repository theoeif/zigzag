import React, { useState, useRef, useEffect } from 'react';
import {
  FaTrashAlt, FaEdit, FaMapMarkerAlt, FaClock,
  FaUser, FaChevronUp, FaChevronDown, FaCalendarPlus,
  FaLink, FaUsers, FaUserFriends, FaCalendarAlt, FaDirections,
  FaCaretDown, FaCaretRight, FaInfoCircle, FaPaperPlane
} from "react-icons/fa";
import { FRONTEND_URL } from '../../config';
import styles from './Project.module.css';
import EventDetailsSection from './EventDetailsSection';
import EventModal from './EventModal';
import { downloadSingleEventICal, generateEventInvite } from '../../api/api';

const EventCard = ({ event, isManageMode, showDelete = true, onDelete, onEdit, onViewCircleMembers, onDetailsToggle, autoOpen = false, onAutoOpened }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  
  // Ref for address element
  const addressRef = useRef(null);
  
  // Invitation link state
  const [invitationUrl, setInvitationUrl] = useState('');
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationError, setInvitationError] = useState(null);
  const [canGenerateInvite, setCanGenerateInvite] = useState(false);
  const [invitationCopied, setInvitationCopied] = useState(false);
  

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

  // Check if event duration is less than 1 day
  const isEventLessThanOneDay = () => {
    if (!event.end_time) return false;
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    return durationDays < 1;
  };

  // Format hour interval for short events (24-hour format, no AM/PM) - returns object for two-line display
  const formatHourInterval = () => {
    if (!event.end_time) return { start: '', end: '' };
    
    // Format time in 24-hour format without AM/PM
    const formatTime24Hour = (dateString) => {
      const date = new Date(dateString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      // If both hours and minutes are 0 (midnight), don't show the time
      if (hours === 0 && minutes === 0) {
        return "";
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    const startTimeStr = formatTime24Hour(event.start_time);
    const endTimeStr = formatTime24Hour(event.end_time);
    
    return { start: startTimeStr, end: endTimeStr };
  };

  // Toggle between showing start date and end date (or hour interval for short events)
  const toggleDateDisplay = () => {
    if (event.end_time) {
      if (isEventLessThanOneDay()) {
        // For events < 1 day, toggle between date and hour interval
        setShowEndDate(!showEndDate);
      } else {
        // For events >= 1 day, toggle between start and end date
        setShowEndDate(!showEndDate);
      }
    }
  };

  // Return full description (no truncation)
  const getDescriptionExcerpt = (description) => {
    if (!description) return "";
    return description;
  };

  // Copy event link to clipboard
  const shareEventLink = async () => {
    try {
      if (event.shareable_link === false) {
        alert("L'hôte a désactivé le partage de lien pour cet événement");
        return;
      }
      
      const shareUrl = `${FRONTEND_URL}/event/${event.id}`;

      // Try modern clipboard API first (works on HTTPS and secure contexts)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert("Lien copié");
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
          alert("Lien copié");
        } else {
          throw new Error('execCommand failed');
        }
      } finally {
        document.body.removeChild(textArea);
      }

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

  // Check if user can generate invitations using backend field
  React.useEffect(() => {
    if (event) {
      console.log("EventCard - Full event object:", event);
      console.log("EventCard - can_generate_invite:", event.can_generate_invite);
      setCanGenerateInvite(event.can_generate_invite || false);
    }
  }, [event]);

  // Generate invitation link
  const handleGenerateInvite = async () => {
    try {
      setInvitationError(null);
      const response = await generateEventInvite(event.id);
      setInvitationUrl(response.invitation_url);
      
      // Immediately copy the link to clipboard
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(response.invitation_url);
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
          document.body.removeChild(textArea);
          if (!successful) {
            throw new Error('execCommand failed');
          }
        }
        
        // Show copy feedback
        setInvitationCopied(true);
        setTimeout(() => setInvitationCopied(false), 2000);
        
        // Show modal with the generated link
        setShowInvitationModal(true);
      } catch (copyError) {
        console.error("Error copying invitation link:", copyError);
        // Still show modal even if copy fails
        setShowInvitationModal(true);
      }
    } catch (error) {
      console.error("Error generating invitation link:", error);
      setInvitationError("Échec de la génération du lien d'invitation");
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

    // Don't redirect if user has selected text (long press or selection)
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      // User is selecting text, don't redirect
      return;
    }

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


  // Clear text selection when clicking outside address element
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only clear if clicking outside the address element
      if (addressRef.current && !addressRef.current.contains(event.target)) {
        const selection = window.getSelection();
        // Simply clear any selection
        if (selection.rangeCount > 0) {
          selection.removeAllRanges();
        }
      }
    };

    // Use capture phase for better performance on mobile
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, []);

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
      position: 'relative'
    }}>
      {/* Date display in right corner with click interaction - more compact version */}
      <div
        className={`${styles.eventDateBadgeProject} ${event.end_time ? styles.clickableDateBadgeProject : ''}`}
        onClick={toggleDateDisplay}
        title={event.end_time ? "Click to toggle date" : ""}
      >
        {/* Only show day name when not displaying hour interval for short events */}
        {!(showEndDate && event.end_time && isEventLessThanOneDay()) && (
          <div className={styles.dayNameProject}>{getDayName(showEndDate && event.end_time ? event.end_time : event.start_time)}</div>
        )}
        <div className={styles.dateTimeCompactProject}>
          {showEndDate && event.end_time ? (
            isEventLessThanOneDay() ? (
              (() => {
                const timeInterval = formatHourInterval();
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    {timeInterval.start && <div>{timeInterval.start}</div>}
                    {timeInterval.end && <div>{timeInterval.end}</div>}
                  </div>
                );
              })()
            ) : (
              formatDateOnly(event.end_time)
            )
          ) : (
            formatDateOnly(event.start_time)
          )}
        </div>
        {/* Time display removed - only showing day and date */}
      </div>

      {/* Content section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Event title and quick info */}
        <div className={styles.eventMainInfoProject}>
          <div className={styles.titleContainerProject}>
            {event.event_shared && (
              <span
                className={styles.sharedEventBadgeProject}
                title="Événement partagé - tous les membres des cercles peuvent modifier la date et la description"
              >
                Partagé
              </span>
            )}
            <h3 className={styles.eventTitleProject}>{event.title}</h3>
          </div>

          {/* Location with icon - NOW CLICKABLE */}
          {event.address && (
            <div 
              ref={addressRef}
              className={styles.eventLocationProject} 
              onClick={openGoogleMaps}
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            >
              <div className={styles.locationLinkProject}>
                <span className={styles.locationIconProject}><FaMapMarkerAlt /></span>
                <span 
                  className={styles.locationTextProject}
                  style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                >
                  {event.address.address_line}
                </span>
                <FaDirections className={styles.directionsIconProject} />
              </div>
            </div>
          )}

          {/* Show description preview in main view */}
          {event.description && (
            <div className={styles.descriptionPreviewProject}>
              <div style={{ whiteSpace: 'pre-line', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                {getDescriptionExcerpt(event.description)}
              </div>
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
            {showDelete && (
              <button
                className={styles.deleteButtonProject}
                onClick={() => onDelete && onDelete(event.id)}
                aria-label="Delete event"
                title="Delete event"
              >
                <FaTrashAlt />
              </button>
            )}
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
              aria-label="Voir les invités"
              title="Voir les invités"
            >
              <FaUserFriends />
            </button>
          )}

          <div className={styles.actionButtonsSpacerProject}></div>

          {/* Only show share button if sharing is allowed and can't generate invite */}
          {!canGenerateInvite && (event.shareable_link === undefined || event.shareable_link === true) && (
            <button
              className={styles.actionButtonProject}
              aria-label="Partager le lien de l'événement"
              onClick={shareEventLink}
              title="Copier le lien de l'événement"
            >
              <FaLink />
            </button>
          )}

          {/* Invitation link button */}
          {canGenerateInvite && (
            <div style={{ position: 'relative' }}>
              <button
                className={styles.actionButtonProject}
                aria-label="Générer un lien d'invitation"
                onClick={handleGenerateInvite}
                title="Générer un lien d'invitation"
              >
                <FaPaperPlane />
              </button>
            </div>
          )}

          <button
            className={styles.actionButtonProject}
            aria-label="Ajouter au calendrier"
            title="Ajouter au calendrier"
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

      {/* Invitation Link Modal */}
      <EventModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        invitationUrl={invitationUrl}
        title="Lien d'invitation généré"
      />
    </div>
  );
};

export default EventCard;
