import React, { useState } from 'react';
import {
  FaMapMarkerAlt, FaClock, FaCalendarAlt, FaLink, FaUsers, FaDirections
} from "react-icons/fa";
import styles from './Project.module.css';

const EventDetailsSection = ({ event, isOpen, onClose, onViewCircleMembers }) => {
  const [urlCopied, setUrlCopied] = useState(false);
  const [showCirclesDropdown, setShowCirclesDropdown] = useState(false);

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
      const shareUrl = event.public_link || `http://localhost:5173/event/${event.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (error) {
      console.error("Error copying share link:", error);
      alert("Échec de la copie du lien. Veuillez réessayer.");
    }
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
      console.error("EventDetailsSection: Invalid circle data:", circle);
      return;
    }

    console.log("EventDetailsSection: Viewing circle members for circle:", circle);

    // Make sure we have valid data
    const circleId = circle.id;
    const circleName = circle.name || `Circle ${circleId}`;

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
                    Cliquer pour ouvrir dans Maps
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.fullDescriptionProject}>
          <strong>Description</strong>
          <p>{event.description || "Aucune description fournie pour cet événement."}</p>
        </div>

        {/* Additional details with icons */}
        <div className={styles.detailsGridProject}>
          <div className={styles.detailItemProject}>
            <FaCalendarAlt />
            <span><strong>Début :</strong> {formatFullDate(event.start_time)}</span>
          </div>

          {event.end_time && (
            <div className={styles.detailItemProject}>
              <FaClock />
              <span><strong>Fin :</strong> {formatFullDate(event.end_time)}</span>
            </div>
          )}

          {/* Copy link button */}
          {event.shareable_link !== false && (event.public_link || event.id) && (
            <div className={styles.detailItemProject}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={copyEventLinkFromDetails}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#40916c',
                    transition: 'all 0.2s ease',
                    fontSize: '14px'
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
                  <FaLink style={{ fontSize: '16px' }} />
                  <span><strong>{urlCopied ? 'Lien copié !' : 'Lien de partage'}</strong></span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Show all circles when expanded */}
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
    </div>
  );
};

export default EventDetailsSection;
