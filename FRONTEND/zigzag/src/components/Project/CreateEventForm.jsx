import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { OPEN_CAGE_API_KEY } from '../../config';
import { createEvent, fetchCircles } from '../../api/api';
import styles from './Project.module.css';


const CreateEventForm = ({ projectId, onEventCreated, onClose }) => {
  // Get current date and time in local timezone, formatted for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // Set time to current time
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get three months later from a given date, maintaining the hour
  const getThreeMonthsLater = (fromDate) => {
    // Parse the date components to ensure consistent behavior
    const parts = fromDate.split('T')[0].split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    const day = parseInt(parts[2], 10);

    // Get the time part if it exists
    const timePart = fromDate.split('T')[1] || "00:00";
    const timeComponents = timePart.split(':');
    const hours = parseInt(timeComponents[0], 10);
    const minutes = parseInt(timeComponents[1], 10);

    // Create a new date with explicit year, month, day, hours, minutes
    const date = new Date(year, month, day, hours, minutes);

    // Add 3 months
    date.setMonth(date.getMonth() + 3);

    // Format back to string in the required format (YYYY-MM-DDTHH:MM)
    const resultYear = date.getFullYear();
    const resultMonth = String(date.getMonth() + 1).padStart(2, '0'); // Add 1 since months are 0-indexed
    const resultDay = String(date.getDate()).padStart(2, '0');
    const resultHours = String(date.getHours()).padStart(2, '0');
    const resultMinutes = String(date.getMinutes()).padStart(2, '0');

    return `${resultYear}-${resultMonth}-${resultDay}T${resultHours}:${resultMinutes}`;
  };

  // Initialize form state with current date for start_time and 3 months later for end_time
  const initialDateTime = getCurrentDateTime();
  const initialEndDateTime = getThreeMonthsLater(initialDateTime);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address_line: '',
    start_time: initialDateTime,
    end_time: initialEndDateTime,
    shareable_link: true,  // Default to true - link is shareable
    event_shared: false,   // Default to false - event is not shared by default
    generate_invitation_link: false,  // Default to false - don't generate invitation link by default
  });

  // State for tracking if the form should be shown
  const [showForm, setShowForm] = useState(true);

  // Detect Chrome browser (more reliable detection - handles Chrome app and mobile)
  const isChrome = typeof navigator !== 'undefined' && (
    // Standard Chrome desktop/mobile (contains "Chrome" but not Edge/Opera)
    (/Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent) && !/OPR/.test(navigator.userAgent) && !/Opera/.test(navigator.userAgent)) ||
    // Chrome iOS (CriOS in user agent)
    /CriOS/.test(navigator.userAgent) ||
    // Check vendor for Google Inc (but exclude Edge/Opera)
    (/Google Inc/.test(navigator.vendor) && !/Edg/.test(navigator.userAgent) && !/OPR/.test(navigator.userAgent) && !/Opera/.test(navigator.userAgent))
  );

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showForm) {
      // Store original values
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;
      const originalHeight = document.body.style.height;
      const scrollY = window.scrollY;
      
      // Add class for CSS rules
      document.body.classList.add('modal-open');
      
      // Add Chrome-specific class if Chrome is detected
      if (isChrome) {
        document.body.classList.add('chrome-browser');
      }
      
      // Also set inline styles for more reliable prevention
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        // Remove classes
        document.body.classList.remove('modal-open');
        document.body.classList.remove('chrome-browser');
        
        // Restore original styles
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [showForm, isChrome]);

  // Removed public/friends-of-friends settings

  // State for address validation
  const [addressError, setAddressError] = useState("");

  // State for date validation
  const [dateError, setDateError] = useState("");
  const [endDateManuallyChanged, setEndDateManuallyChanged] = useState(false);

  // State for circle selection UI
  const [allCircles, setAllCircles] = useState([]);
  const [selectedCircles, setSelectedCircles] = useState([]);

  // State for localized address information
  const [localizedAddress, setLocalizedAddress] = useState(null);
  const [localizeError, setLocalizeError] = useState("");

  // Fetch all circles on mount
  useEffect(() => {
    const loadCircles = async () => {
      try {
        const circlesData = await fetchCircles();
        if (circlesData) {
          // Sort circles alphabetically by name (case-insensitive)
          const sortedCircles = [...circlesData].sort((a, b) => 
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          );
          setAllCircles(sortedCircles);
        }
      } catch (err) {
        console.error("Error fetching circles:", err);
      }
    };
    loadCircles();
  }, []);

  // Update end_time when start_time changes (only if end date hasn't been manually changed)
  useEffect(() => {
    if (formData.start_time && !endDateManuallyChanged) {
      const calculatedEndTime = getThreeMonthsLater(formData.start_time);

      // Only update if it's different from the current end time
      if (calculatedEndTime !== formData.end_time) {
        setFormData(prev => ({
          ...prev,
          end_time: calculatedEndTime
        }));
      }
    }

    // Validate dates if both exist
    if (formData.start_time && formData.end_time) {
      validateDates(formData.start_time, formData.end_time);
    }
  }, [formData.start_time, endDateManuallyChanged]);

  // Re-validate anytime either date changes
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      validateDates(formData.start_time, formData.end_time);
    } else {
      // No end date means no error to show
      setDateError("");
    }
  }, [formData.start_time, formData.end_time]);

  // Validate that end date is not earlier than start date
  const validateDates = (startDate, endDate) => {
    if (!startDate || !endDate) return true;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setDateError("La date de fin ne peut pas être antérieure à la date de début");
      return false;
    } else {
      setDateError("");
      return true;
    }
  };

  // Handle change for all text/select/checkbox inputs except circles
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Special case for start_time to make hour optional
    if (name === 'start_time' && value) {
      // If user only enters a date without time (YYYY-MM-DD),
      // automatically add T00:00 to make it valid
      if (value.length === 10 || !value.includes('T')) {
        const dateWithDefaultTime = `${value.split('T')[0]}T00:00`;
        setFormData(prev => ({
          ...prev,
          [name]: dateWithDefaultTime
        }));
        return;
      }
    }

    // Special handling for end_time
    if (name === 'end_time') {
      setEndDateManuallyChanged(true);

      // If user cleared the end date, clear any date error and update state
      if (!value) {
        setDateError("");
        setFormData(prev => ({ ...prev, [name]: "" }));
        return;
      }

      // If user only enters a date (YYYY-MM-DD) without time
      if (value.length === 10 || !value.includes('T')) {
        const dateWithDefaultTime = `${value.split('T')[0]}T00:00`;

        // Validate against start date
        if (formData.start_time) {
          validateDates(formData.start_time, dateWithDefaultTime);
        }

        setFormData(prev => ({
          ...prev,
          [name]: dateWithDefaultTime
        }));
        return;
      }

      // For full date-time values, also validate
      if (formData.start_time) {
        validateDates(formData.start_time, value);
      }
    }

    if (name === 'address_line') {
      // Clear any previous validation errors when address is being typed
      setAddressError("");
      setLocalizedAddress(null);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle change for friends-of-friends flag
  const handleFriendsOfFriendsChange = (e) => {
    // This function is no longer needed as friends-of-friends is removed
  };

  // Handle tickbar for circles selection
  const handleCircleSelection = (e) => {
    const circleId = parseInt(e.target.value, 10);

    if (e.target.checked) {
      if (!selectedCircles.includes(circleId)) {
        setSelectedCircles(prev => [...prev, circleId]);
      }
    } else {
      setSelectedCircles(prev => prev.filter(id => id !== circleId));
    }
  };

  // Select all or none circles
  const handleSelectAllCircles = () => {
    if (selectedCircles.length === allCircles.length) {
      setSelectedCircles([]);
    } else {
      setSelectedCircles(allCircles.map(circle => circle.id));
    }
  };

  // Localize address using OpenCage Geocoding API
  const handleLocalizeAddress = async () => {
    if (!formData.address_line) {
      setLocalizeError("Veuillez saisir une adresse à localiser.");
      return;
    }

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(formData.address_line)}&key=${OPEN_CAGE_API_KEY}`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const { formatted, components, geometry } = result;

        // Extract city from components, fallback to town or village if no city
        const resolvedCity = components.city || components.town || components.village || "";

        setLocalizedAddress({
          address_line: formatted,
          city: resolvedCity,
          state: components.state || "",
          country: components.country || "",
          postal_code: components.postcode || "",
          latitude: geometry.lat,
          longitude: geometry.lng,
        });

        setLocalizeError("");

        // Update the form data with the formatted address for better UX
        setFormData(prev => ({
          ...prev,
          address_line: formatted
        }));
      } else {
        setLocalizeError("L'adresse n'a pas pu être localisée. Est-elle correcte ?");
      }
    } catch (error) {
      console.error("Localization error:", error);
      setLocalizeError("Une erreur s'est produite lors de la localisation.");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate address is not empty
    if (!formData.address_line.trim()) {
      setAddressError("L'adresse est requise");
      return;
    }

    // Validate that address is localized
    if (!localizedAddress) {
      setAddressError("Veuillez d'abord localiser l'adresse");
      return;
    }

    // Validate dates
    if (formData.end_time && !validateDates(formData.start_time, formData.end_time)) {
      return; // Don't submit if dates are invalid
    }

    // Backend handles authentication automatically

    // Convert local datetime-local values to UTC ISO strings
    const toUtcIso = (localDateTimeString) => {
      if (!localDateTimeString) return null;
      // Ensure we have "YYYY-MM-DDTHH:MM" format
      const normalized = localDateTimeString.includes('T') ? localDateTimeString : `${localDateTimeString}T00:00`;
      return new Date(normalized).toISOString();
    };

    const eventData = {
      title: formData.title,
      description: formData.description,
      address: localizedAddress,
      start_time: toUtcIso(formData.start_time),
      end_time: formData.end_time ? toUtcIso(formData.end_time) : null,
      shareable_link: formData.shareable_link,
      event_shared: formData.event_shared,
      generate_invitation_link: formData.generate_invitation_link,
      project: projectId,
      circle_ids: selectedCircles,
    };

    try {
      const createdEvent = await createEvent(eventData);

      // Close form and notify parent component
      setShowForm(false);

      if (onEventCreated) {
        // Pass full event data including coordinates and dates for spatiotemporal navigation
        const eventWithLocation = {
          ...createdEvent,
          lat: localizedAddress.latitude,
          lng: localizedAddress.longitude,
          start_date: formData.start_time,
          end_date: formData.end_time
        };
        onEventCreated(eventWithLocation);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error creating event:", error);

      let errorMessage = "Erreur lors de la création de l'événement";

      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage += `: ${error.response.data}`;
        } else if (error.response.data.detail) {
          errorMessage += `: ${error.response.data.detail}`;
        } else {
          // Format nested errors
          const errors = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('; ');
          errorMessage += `: ${errors}`;
        }
      }

      alert(errorMessage);
    }
  };

  if (!showForm) {
    return null;
  }

  return (
    <>
      <div className={styles.modalOverlayProjectNoAnimation || styles.modalOverlayProject}
           onMouseDown={(e) => {
             if (e.target === e.currentTarget && typeof onClose === 'function') {
               onClose();
             }
           }}
           style={{ zIndex: 3000 }}>
      <div
        className={styles.modalContentProjectRounded}
      >
        <div className={styles.modalHeaderProject}>
          <div className={styles.popupTitleWrapper}>
            <h3 className={styles.modalTitleProject}>Nouveau projet</h3>
          </div>
          <button onClick={onClose} className={styles.closeButtonProject}>✕</button>
        </div>

        <div className={styles.modalContentProjectRoundedInner}>
          <form
            onSubmit={handleSubmit}
            className={styles.eventFormProject}
            style={{
              padding: '20px',
              overflow: 'visible',
              flex: 1
            }}
          >
          <div className={styles.formGroupProject}>
            <label className={styles.formLabelProject}>Titre :</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={styles.formInputProject}
              required
            />
          </div>

          <div className={styles.formGroupProject}>
            <label className={styles.formLabelProject}>Description :</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.formTextareaProject}
              rows="4"
              placeholder="Projet, liens etc."
            />
          </div>

          <div className={styles.formGroupProject}>
            <label className={styles.formLabelProject}>Adresse :</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea
                name="address_line"
                value={formData.address_line}
                onChange={handleInputChange}
                className={`${styles.formTextareaProjectNoResize} ${addressError ? styles.inputErrorProject : ''}`}
                style={{ flexGrow: 1 }}
                placeholder="Saisir l'emplacement"
                required
              />
              <button
                type="button"
                onClick={handleLocalizeAddress}
                className={styles.localizeButtonProject}
                disabled={!formData.address_line}
                style={{
                  minWidth: '100px',
                  backgroundColor: '#40916c',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  border: 'none',
                  cursor: formData.address_line ? 'pointer' : 'not-allowed',
                  opacity: formData.address_line ? 1 : 0.7
                }}
              >
                Localiser
              </button>
            </div>
            {addressError && <p className={styles.errorMessageProject}>{addressError}</p>}
          </div>

          {localizeError && <p className={styles.errorMessageProject}>{localizeError}</p>}

          {localizedAddress && (
            <div className={styles.formGroupProject} style={{ marginBottom: '15px', width: '100%', padding: 0 }}>
              <div
                className={styles.localizedInfoProject}
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                padding: '12px 15px',
                marginBottom: 0,
                fontSize: '0.9rem',
                maxHeight: '150px',
                overflowY: 'auto',
                overflowX: 'hidden',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                whiteSpace: 'normal',
                position: 'relative'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '4px',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '6px',
                minWidth: 0,
                flexShrink: 0,
                width: '100%',
                maxWidth: '100%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, width: '100%', maxWidth: '100%' }}>
                  <span style={{ marginRight: '8px', color: '#4285F4', flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="#4285F4">
                      <path d="M0 0h24v24H0z" fill="none"/>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </span>
                  <strong style={{ fontSize: '0.95rem', wordWrap: 'break-word', overflowWrap: 'break-word', flex: '1', minWidth: 0 }}>Adresse localisée</strong>
                </div>
              </div>
              <p style={{ 
                margin: '2px 0', 
                wordWrap: 'break-word', 
                overflowWrap: 'break-word', 
                minWidth: 0,
                width: '100%',
                maxWidth: '100%',
                whiteSpace: 'normal',
                overflow: 'visible',
                display: 'block'
              }}>{localizedAddress.address_line}</p>
              <p style={{ 
                margin: '2px 0', 
                color: '#666', 
                fontSize: '0.85rem', 
                wordWrap: 'break-word', 
                overflowWrap: 'break-word', 
                minWidth: 0,
                width: '100%',
                maxWidth: '100%',
                whiteSpace: 'normal',
                overflow: 'visible',
                display: 'block'
              }}>
                {localizedAddress.city}{localizedAddress.city && localizedAddress.state ? ', ' : ''}
                {localizedAddress.state}{(localizedAddress.city || localizedAddress.state) && localizedAddress.country ? ', ' : ''}
                {localizedAddress.country} {localizedAddress.postal_code}
              </p>
              </div>
            </div>
          )}

          <div className={styles.formGroupProject}>
            <label className={styles.formLabelProject}>Début :</label>
            <input
              type="datetime-local"
              name="start_time"
              value={formData.start_time}
              onChange={handleInputChange}
              className={styles.formInputProject}
              required
            />
            <small style={{ color: '#666', fontStyle: 'italic' }}>Ajuster l'heure si nécessaire</small>
          </div>

          <div className={styles.formGroupProject}>
            <label className={styles.formLabelProject}>Fin :</label>
            <input
              type="datetime-local"
              name="end_time"
              value={formData.end_time}
              onChange={handleInputChange}
              className={`${styles.formInputProject} ${dateError ? styles.inputErrorProject : ''}`}
            />
            {dateError ? (
              <p style={{ color: '#d32f2f', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                {dateError}
              </p>
            ) : (
              <small style={{ color: '#40916c', fontStyle: 'italic' }}>
                {!endDateManuallyChanged && "3 mois après par défaut"}
              </small>
            )}
          </div>

          {allCircles.length > 0 && (
            <fieldset
              className={styles.fieldsetGroupProject}
            >
              <legend className={styles.fieldsetLegendProject}>Cercles :</legend>

            {/* Container for the 'Select All' button */}
            <div className={styles.selectAllContainerProject}>
              <button
                type="button"
                onClick={handleSelectAllCircles}
                className={styles.selectAllButtonProject}
                style={{
                  backgroundColor: '#40916c',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {selectedCircles.length === allCircles.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>

            <div
              className={styles.checkboxGroupProject}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
                padding: '5px'
              }}
            >
              {allCircles.map((circle) => (
                <div key={circle.id} className={styles.checkboxContainerProject}>
                  <input
                    type="checkbox"
                    id={`circle-${circle.id}`}
                    name="circles"
                    value={circle.id}
                    checked={selectedCircles.includes(circle.id)}
                    onChange={handleCircleSelection}
                    className={styles.checkboxInputProject}
                  />
                  <label htmlFor={`circle-${circle.id}`} className={styles.checkboxLabelProject}>{circle.name}</label>
                </div>
              ))}
            </div>
            </fieldset>
          )}

          {/* Event sharing options */}
          <fieldset
            className={styles.fieldsetGroupProject}
          >
            <legend className={styles.fieldsetLegendProject}>Partage :</legend>

            <div className={styles.checkboxContainerProject}>
              <input
                type="checkbox"
                id="event_shared"
                name="event_shared"
                checked={formData.event_shared}
                onChange={handleInputChange}
                className={styles.checkboxInputProject}
              />
              <div className={styles.checkboxLabelContainer}>
                <label htmlFor="event_shared" className={styles.checkboxLabelProject}>
                  Événement ouvert
                </label>
                <div className={styles.infoIconProject}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  <div className={styles.tooltipProject}>
                    Tous les membres des cercles peuvent modifier la description et la date
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.checkboxContainerProject}>
              <input
                type="checkbox"
                id="shareable_link"
                name="shareable_link"
                checked={formData.shareable_link}
                onChange={handleInputChange}
                className={styles.checkboxInputProject}
              />
              <div className={styles.checkboxLabelContainer}>
                <label htmlFor="shareable_link" className={styles.checkboxLabelProject}>
                  Lien URL
                </label>
                <div className={styles.infoIconProject}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  <div className={styles.tooltipProject}>
                    Lien de partage entre les membres des Cercles
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.checkboxContainerProject}>
              <input
                type="checkbox"
                id="generate_invitation_link"
                name="generate_invitation_link"
                checked={formData.generate_invitation_link}
                onChange={handleInputChange}
                className={styles.checkboxInputProject}
              />
              <div className={styles.checkboxLabelContainer}>
                <label htmlFor="generate_invitation_link" className={styles.checkboxLabelProject}>
                  Lien d'invitation
                </label>
                <div className={styles.infoIconProject}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  <div className={styles.tooltipProject}>
                    Génère un lien d'invitation pour des personnes externes
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          <div className={styles.buttonGroupProject}>
            <button type="submit" className={styles.submitButtonProject}>
              Créer l'événement
            </button>
          </div>
          
          {/* Artificial spacer component at bottom for Chrome to ensure button is visible */}
          {isChrome && (
            <div style={{ 
              height: '50px', 
              width: '100%',
              flexShrink: 0,
              backgroundColor: 'transparent'
            }} />
          )}
          </form>
        </div>
      </div>
    </div>
    </>
  );
};

export default CreateEventForm;
