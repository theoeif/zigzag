import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { OPEN_CAGE_API_KEY } from '../../config';
import { patchEvent } from '../../api/api';
import styles from './Project.module.css';


const EditEventForm = ({ eventData, onClose, onEventUpdated, setEditMode, setIsManageMode, isCreator = false }) => {
  // Pre-fill form state with current event values
  const [formData, setFormData] = useState({
    description: eventData.description || "",
    address_line: eventData.address?.address_line || "",
    event_shared: eventData.event_shared || false,
    start_time: eventData.start_time ? toLocalDatetimeInputValue(eventData.start_time) : "",
    end_time: eventData.end_time ? toLocalDatetimeInputValue(eventData.end_time) : "",
  });

  const [localizedAddress, setLocalizedAddress] = useState(null);
  const [localizeError, setLocalizeError] = useState("");

  // Add a new state to track if address has been changed
  const [addressModified, setAddressModified] = useState(false);
  // Add a state to track if the address should be removed
  const [removeAddress, setRemoveAddress] = useState(false);

  // State for date validation
  const [dateError, setDateError] = useState("");

  // Clean up edit mode when component unmounts
  useEffect(() => {
    return () => {
      if (setIsManageMode) setIsManageMode(false);
      if (setEditMode) setEditMode(null);
    };
  }, [setEditMode, setIsManageMode]);

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

  // Re-validate anytime either date changes
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      validateDates(formData.start_time, formData.end_time);
    } else {
      // No end date means no error to show
      setDateError("");
    }
  }, [formData.start_time, formData.end_time]);

  const handleInputChange = (e) => {
    const { name, type } = e.target;
    const value = type === 'checkbox' ? e.target.checked : e.target.value;

    // Special handling for end_time
    if (name === 'end_time') {
      // If user cleared the end date, clear any date error and update state
      if (!value) {
        setDateError("");
        setFormData(prev => ({ ...prev, [name]: "" }));
        return;
      }

      // For full date-time values, validate
      if (formData.start_time) {
        validateDates(formData.start_time, value);
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'address_line') {
      // If the address is cleared completely, set removeAddress to true
      if (value === '') {
        setRemoveAddress(true);
      } else {
        setRemoveAddress(false);
        setAddressModified(true);
        setLocalizedAddress(null);
        setLocalizeError("");
      }
    }
  };

  // Helper: convert ISO string to value suitable for input[type=datetime-local]
  function toLocalDatetimeInputValue(isoString) {
    try {
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch {
      return "";
    }
  }

  // Add function to clear address
  const handleClearAddress = () => {
    setFormData(prev => ({
      ...prev,
      address_line: ""
    }));
    setRemoveAddress(true);
    setAddressModified(true);
    setLocalizedAddress(null);
    setLocalizeError("");
  };

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

  // Function to handle closing the form
  const handleCloseForm = () => {
    // Reset both edit mode states
    if (setIsManageMode) setIsManageMode(false);
    if (setEditMode) setEditMode(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let updatedFields = {};

    const previouslyShared = !!eventData.event_shared;
    const showDateInputs = previouslyShared && !!formData.event_shared;

    // Handle description field
    if (formData.description !== eventData.description) {
      updatedFields.description = formData.description;
    }

    // Handle event_shared field
    if (formData.event_shared !== eventData.event_shared) {
      updatedFields.event_shared = formData.event_shared;
    }

    // Handle address based on modified state (creator only)
    if (isCreator) {
      if (removeAddress) {
        // If address was removed, set it to null
        updatedFields.address = null;
      } else if (addressModified && localizedAddress) {
        // If address was modified and localized, use the localized address
        updatedFields.address = { ...localizedAddress };
      }
    }

    // Validate dates before submission
    if (formData.end_time && !validateDates(formData.start_time, formData.end_time)) {
      return; // Don't submit if dates are invalid
    }

    // Handle dates only when allowed (shared before and still shared)
    if (showDateInputs) {
      if (formData.start_time) {
        const newStartIso = new Date(formData.start_time).toISOString();
        if (newStartIso !== eventData.start_time) {
          updatedFields.start_time = newStartIso;
        }
      }
      if (formData.end_time) {
        const newEndIso = new Date(formData.end_time).toISOString();
        if (newEndIso !== eventData.end_time) {
          updatedFields.end_time = newEndIso;
        }
      }
    }

    // Only submit if there are changes
    if (Object.keys(updatedFields).length === 0) {
      alert("Aucune modification à sauvegarder");
      return;
    }

    try {
      const updatedData = await patchEvent(eventData.id, updatedFields);

      // Reset both edit states before updating
      if (setIsManageMode) setIsManageMode(false);
      if (setEditMode) setEditMode(null);

      // Create merged event data with updates
      const updatedEvent = { ...eventData, ...updatedData };

      if (onEventUpdated) {
        onEventUpdated(updatedEvent);
      }

      onClose();
    } catch (error) {
      console.error("Error updating event:", error);

      // Still reset edit states on error
      if (setIsManageMode) setIsManageMode(false);
      if (setEditMode) setEditMode(null);

      alert("Erreur lors de la mise à jour de l'événement : " + (error.response?.data?.detail || error.message || "Erreur inconnue"));
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlayProjectNoAnimation || styles.modalOverlayProject}
         style={{ zIndex: 1500 }}>
      <div
        className={styles.modalContentProjectRounded}
      >
        <div className={styles.modalHeaderProject}>
          <div className={styles.popupTitleWrapper}>
            <h3 className={styles.modalTitleProject}>Modifier</h3>
          </div>
          <button onClick={handleCloseForm} className={styles.closeButtonProject}>✕</button>
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

          {isCreator && (
            <div className={styles.formGroupProject}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.formLabelProject}>Adresse :</label>
                <button
                  type="button"
                  onClick={handleClearAddress}
                  className={styles.clearButtonProject}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Effacer
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <textarea
                  name="address_line"
                  value={formData.address_line}
                  onChange={handleInputChange}
                  className={styles.formTextareaProjectNoResize}
                  style={{ flexGrow: 1 }}
                  placeholder="Saisir l'adresse ou laisser vide pour supprimer"
                />
                <button
                  type="button"
                  onClick={handleLocalizeAddress}
                  className={styles.localizeButtonProject}
                  disabled={!formData.address_line || removeAddress}
                  style={{
                    minWidth: '100px',
                    backgroundColor: '#40916c',
                    color: 'white',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    border: 'none',
                    cursor: formData.address_line && !removeAddress ? 'pointer' : 'not-allowed',
                    opacity: formData.address_line && !removeAddress ? 1 : 0.7
                  }}
                >
                  Localiser
                </button>
              </div>

              {formData.address_line && addressModified && !localizedAddress && !removeAddress && (
                <p className={styles.warningTextProject}>Adresse modifiée - nécessite une localisation</p>
              )}
              {removeAddress && (
                <p style={{ fontSize: '0.9rem', color: '#2d6a4f', marginTop: '5px' }}>
                  L'adresse sera supprimée lors de la mise à jour de l'événement
                </p>
              )}
            </div>
          )}

          {localizeError && <p className={styles.errorMessageProject}>{localizeError}</p>}

          {localizedAddress && !removeAddress && (
            <div
              className={styles.localizedInfoProject}
              style={{
                maxHeight: '150px',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
                padding: '10px 15px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                marginBottom: '15px',
                fontSize: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '4px',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px', color: '#4285F4' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="#4285F4">
                      <path d="M0 0h24v24H0z" fill="none"/>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </span>
                  <strong style={{ fontSize: '0.95rem' }}>Adresse localisée</strong>
                </div>
              </div>
              <p style={{ margin: '2px 0' }}>{localizedAddress.address_line}</p>
              <p style={{ margin: '2px 0', color: '#666', fontSize: '0.85rem' }}>
                {localizedAddress.city}{localizedAddress.city && localizedAddress.state ? ', ' : ''}
                {localizedAddress.state}{(localizedAddress.city || localizedAddress.state) && localizedAddress.country ? ', ' : ''}
                {localizedAddress.country} {localizedAddress.postal_code}
              </p>
            </div>
          )}

          {/* Event sharing options - only creator can toggle */}
          {isCreator && (
            <div className={styles.formGroupProject}>
              <div className={styles.checkboxContainerProject}>
                <input
                  type="checkbox"
                  id="event_shared"
                  name="event_shared"
                  checked={formData.event_shared}
                  onChange={handleInputChange}
                  className={styles.checkboxInputProject}
                />
                <label htmlFor="event_shared" className={styles.checkboxLabelProject}>
                  Événement partagé
                  <div className={styles.infoIconProject}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    <div className={styles.tooltipProject}>
                      Tous les membres des cercles peuvent modifier la description et la date
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Dates (shared-only) */}
          {(() => {
            const previouslyShared = !!eventData.event_shared;
            const showDateInputs = previouslyShared && !!formData.event_shared;
            if (!showDateInputs) return null;
            return (
              <div className={styles.formGroupProject}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ width: '100%' }}>
                    <label className={styles.formLabelProject} htmlFor="start_time" style={{ fontSize: '0.9rem' }}>Début</label>
                    <input
                      type="datetime-local"
                      id="start_time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      className={styles.formInputProject}
                    />
                  </div>
                  <div style={{ width: '100%' }}>
                    <label className={styles.formLabelProject} htmlFor="end_time" style={{ fontSize: '0.9rem' }}>Fin (optionnel)</label>
                    <input
                      type="datetime-local"
                      id="end_time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      className={`${styles.formInputProject} ${dateError ? styles.inputErrorProject : ''}`}
                    />
                    {dateError && (
                      <p style={{ color: '#d32f2f', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                        {dateError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className={styles.buttonGroupProject}>
            <button
              type="submit"
              className={styles.submitButtonProject}
              style={{
                backgroundColor: '#40916c',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                fontSize: '1rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Mettre à jour
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEventForm;
