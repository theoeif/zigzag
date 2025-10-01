import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { OPEN_CAGE_API_KEY } from '../../config';
import { patchEvent } from '../../api/api';
import styles from './Project.module.css';


const EditEventForm = ({ eventData, onClose, onEventUpdated, setEditMode, setIsManageMode }) => {
  // Pre-fill form state with current event values
  const [formData, setFormData] = useState({
    description: eventData.description || "",
    address_line: eventData.address?.address_line || "",
  });

  const [localizedAddress, setLocalizedAddress] = useState(null);
  const [localizeError, setLocalizeError] = useState("");

  // Add a new state to track if address has been changed
  const [addressModified, setAddressModified] = useState(false);
  // Add a state to track if the address should be removed
  const [removeAddress, setRemoveAddress] = useState(false);

  // Clean up edit mode when component unmounts
  useEffect(() => {
    return () => {
      if (setIsManageMode) setIsManageMode(false);
      if (setEditMode) setEditMode(null);
    };
  }, [setEditMode, setIsManageMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

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
      setLocalizeError("Please enter an address to localize.");
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
        setLocalizeError("Address could not be localized. Is it correct?");
      }
    } catch (error) {
      console.error("Localization error:", error);
      setLocalizeError("An error occurred during localization.");
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

    // Handle description field
    if (formData.description !== eventData.description) {
      updatedFields.description = formData.description;
    }

    // Handle address based on modified state
    if (removeAddress) {
      // If address was removed, set it to null
      updatedFields.address = null;
    } else if (addressModified && localizedAddress) {
      // If address was modified and localized, use the localized address
      updatedFields.address = { ...localizedAddress };
    }

    // Only submit if there are changes
    if (Object.keys(updatedFields).length === 0) {
      alert("No changes to save");
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

      alert("Error updating event: " + (error.response?.data?.detail || error.message || "Unknown error"));
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlayProjectNoAnimation || styles.modalOverlayProject}
         style={{ zIndex: 1500 }}>
      <div 
        className={styles.modalContentProjectRounded}
      >
        <div 
          className={styles.popupHeaderProjectEnhanced}
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: 'white',
            borderBottom: '1px solid #eee',
            animation: 'none',
            transition: 'none',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
        >
          <div className={styles.popupTitleWrapper}>
            <h3 className={styles.modalTitleProject}>Edit</h3>
          </div>
          <button onClick={handleCloseForm} className={styles.closeButtonProjectEnhanced}>
            ✕
          </button>
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
            <label className={styles.formLabelProject}>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.formTextareaProject}
              rows="4"
              placeholder="Enter event description"
            />
          </div>

          <div className={styles.formGroupProject}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className={styles.formLabelProject}>Address:</label>
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
                Clear
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                name="address_line"
                value={formData.address_line}
                onChange={handleInputChange}
                className={styles.formInputProject}
                style={{ flexGrow: 1 }}
                placeholder="Enter address or leave empty to remove"
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
                Localize
              </button>
            </div>

            {formData.address_line && addressModified && !localizedAddress && !removeAddress && (
              <p className={styles.warningTextProject}>Address changed - needs localization</p>
            )}
            {removeAddress && (
              <p style={{ fontSize: '0.9rem', color: '#2d6a4f', marginTop: '5px' }}>
                Address will be removed when you update the event
              </p>
            )}
          </div>

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
                  <strong style={{ fontSize: '0.95rem' }}>Localized Address</strong>
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

          <div
            className={styles.buttonGroupProject}
            style={{
              marginTop: '25px',
              marginBottom: '15px',
              position: 'sticky',
              bottom: 0,
              background: 'white',
              padding: '15px 0 5px',
              borderTop: '1px solid #f0f0f0',
              zIndex: 5,
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px'
            }}
          >
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
              Update Project
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEventForm;
