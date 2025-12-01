import React, { useState } from 'react';
import {
  FaMapMarkerAlt, FaClock, FaCalendarAlt, FaLink, FaUsers, FaDirections, FaUserFriends, FaPaperPlane
} from "react-icons/fa";
import { FRONTEND_URL } from '../../config';
import { generateEventInvite } from '../../api/api';
import EventModal from './EventModal';
import styles from './Project.module.css';
import { renderDescriptionWithLinks } from '../../utils/descriptionParser.jsx';

const EventDetailsSection = ({ event, isOpen, onClose, onViewCircleMembers }) => {
  const [urlCopied, setUrlCopied] = useState(false);
  const [showCirclesDropdown, setShowCirclesDropdown] = useState(false);
  
  // Invitation link state
  const [invitationUrl, setInvitationUrl] = useState('');
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationError, setInvitationError] = useState(null);
  const [canGenerateInvite, setCanGenerateInvite] = useState(false);
  const [invitationCopied, setInvitationCopied] = useState(false);

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
      return date.toLocaleDateString('fr-FR', {
        ...dateFormat,
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return date.toLocaleDateString('fr-FR', dateFormat);
  };

  // Copy event link from details section
  const copyEventLinkFromDetails = async () => {
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
      alert("Échec de la copie du lien. Veuillez réessayer.");
    }
  };

  // Check if user can generate invitations using backend field
  React.useEffect(() => {
    if (event) {
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
      setInvitationError("Failed to generate invitation link");
    }
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

  // Helper to safely render circles
  const renderCircles = () => {
    // Simplified function that directly uses the enhanced circle data from the API
    if (!event.circles || !Array.isArray(event.circles)) {
      return [];
    }

    // Now the circles data should already have id and name properties
    return event.circles.map(circle => ({
      id: circle.id,
      name: circle.is_invitation_circle ? 'Cercle invités' : (circle.name || `Circle ${circle.id}`)
    }));
  };

  // Handler to view circle members
  const handleViewCircleMembers = (circle) => {
    if (!circle || (!circle.id && circle.id !== 0)) {
      console.error("EventDetailsSection: Invalid circle data:", circle);
      return;
    }

    console.log("EventDetailsSection: Viewing circle members for circle:", circle);

    // Make sure we have valid data
    const circleId = circle.id;
    const circleName = circle.is_invitation_circle ? 'Cercle invités' : (circle.name || `Circle ${circleId}`);

    // Only proceed if we have an ID
    if (circleId !== undefined && circleId !== null) {
      console.log(`EventDetailsSection: Passing circleId=${circleId}, circleName=${circleName} to parent`);
      onViewCircleMembers && onViewCircleMembers(circleId, circleName);
    } else {
      console.error("EventDetailsSection: Missing circle ID:", circle);
    }
  };

  // Get circle data
  const circleData = renderCircles();
  const hasCircles = circleData.length > 0;

  if (!isOpen) return null;

  return (
    <div className={styles.eventDetailsSectionContainer}>
      <div
        className={styles.popupHeaderProjectEnhanced}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'white',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '15px 20px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}
      >
        <div className={styles.popupTitleWrapper}>
          <h3 className={styles.modalTitleProject} style={{ margin: 0, textAlign: 'center', width: '100%' }}>{event.title}</h3>
        </div>
        <button onClick={onClose} className={styles.closeButtonProject} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }}>
          ✕
        </button>
      </div>

      <div className={styles.eventDetailsSectionContent} style={{ padding: '15px' }}>
        {/* Location with map */}
        {event.address && event.address.latitude && event.address.longitude && (
          <div style={{
            marginBottom: '15px',
            borderRadius: '8px',
            overflow: 'hidden'
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
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '4px',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    msUserSelect: 'text'
                  }}>
                    {event.address.address_line}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    Cliquer pour ouvrir dans Maps
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.fullDescriptionProject} style={{ marginBottom: '20px' }}>
          <strong>Description</strong>
          <div style={{ 
            whiteSpace: 'pre-line',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            msUserSelect: 'text'
          }}>
            {event.description ? renderDescriptionWithLinks(event.description) : "Aucune description fournie pour cet événement."}
          </div>
        </div>

        {/* Dates section */}
        <div style={{ 
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div className={styles.detailItemProject} style={{ marginBottom: '12px' }}>
            <FaCalendarAlt />
            <span><strong>Début :</strong> {formatFullDate(event.start_time)}</span>
          </div>

          {event.end_time && (
            <div className={styles.detailItemProject}>
              <FaClock />
              <span><strong>Fin :</strong> {formatFullDate(event.end_time)}</span>
            </div>
          )}
        </div>

        {/* Links section */}
        <div style={{ marginBottom: '15px' }}>
          {/* Copy link button - show if shareable_link is not false */}
          {event.shareable_link !== false && (event.public_link || event.id) && (
            <div className={styles.detailItemProject} style={{ marginBottom: '8px' }}>
              <FaLink style={{ fontSize: '1.1rem', color: '#40916c', minWidth: '20px', flexShrink: 0 }} />
              <button
                onClick={copyEventLinkFromDetails}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#40916c',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f0f7f4';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.transform = 'scale(1)';
                }}
                title="Copier le lien"
              >
                <span><strong>{urlCopied ? 'Lien copié !' : 'Lien URL'}</strong></span>
              </button>
            </div>
          )}

          {/* Invitation link button */}
          {canGenerateInvite && (
            <div className={styles.detailItemProject} style={{ position: 'relative' }}>
              <FaPaperPlane style={{ fontSize: '1.1rem', color: '#40916c', minWidth: '20px', flexShrink: 0 }} />
              <button
                onClick={handleGenerateInvite}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#40916c',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f0f7f4';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.transform = 'scale(1)';
                }}
                title="Générer un lien d'invitation"
              >
                <span><strong>Lien d'invitation</strong></span>
              </button>
              {invitationCopied && (
                <div style={{
                  position: 'absolute',
                  bottom: '30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#40916c',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  zIndex: 1000
                }}>
                  Lien d'invitation copié !
                </div>
              )}
              {invitationError && (
                <div style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '4px' }}>
                  {invitationError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Show all circles when expanded */}
        <div className={styles.allCirclesSectionProject} style={{ marginTop: '10px' }}>
          {hasCircles && (
            <div className={styles.allCirclesProject}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
                paddingBottom: '5px'
              }}>
                <h4 style={{ margin: '5px 0', fontSize: '1rem' }}>Cercles et invités :</h4>
                <span style={{
                  color: '#666',
                  fontSize: '0.9rem',
                  backgroundColor: '#f0f0f0',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {circleData.length} {circleData.length === 1 ? 'cercle' : 'cercles'}
                </span>
              </div>

              {/* Control how many circles to display */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                margin: '8px 0'
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
                    <span>{circle.is_invitation_circle ? 'Cercle invités' : (circle.name || `Circle ${circle.id}`)}</span>
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
                    +{circleData.length - 3} de plus
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
                    Afficher moins
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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

export default EventDetailsSection;
