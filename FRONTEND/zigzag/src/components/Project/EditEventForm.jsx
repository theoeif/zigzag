import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { patchEvent, fetchCircles } from '../../api/api';
import styles from './Project.module.css';

const OPEN_CAGE_API_KEY = "a51c63b182214f16ba4d28f56b0f191f";

const EditEventForm = ({ eventData, onClose, onEventUpdated, setEditMode, setIsManageMode }) => {
  // Format datetime string for input datetime-local if it exists
  const formatDatetimeForInput = (datetimeStr) => {
    if (!datetimeStr) return "";
    // ISO string format: YYYY-MM-DDTHH:MM:SS.sssZ
    // Input datetime-local expects: YYYY-MM-DDTHH:MM
    try {
      const date = new Date(datetimeStr);
      return date.toISOString().slice(0, 16);
    } catch (err) {
      console.error("Error formatting date:", err);
      return "";
    }
  };

  // Pre-fill form state with current event values
  const [formData, setFormData] = useState({
    title: eventData.title || "",
    description: eventData.description || "",
    address_line: eventData.address?.address_line || "",
    start_time: formatDatetimeForInput(eventData.start_time) || "",
    end_time: formatDatetimeForInput(eventData.end_time) || "",
    whatsapp_group_link: eventData.whatsapp_group_link || "",
    is_public: eventData.is_public || false,
    shareable_link: eventData.shareable_link !== undefined ? eventData.shareable_link : true,
  });

  // New state for friends-of-friends flag:
  const [friendsOfFriendsAllowed, setFriendsOfFriendsAllowed] = useState(
    eventData.friends_of_friends_allowed || false
  );

  // Add state for date validation errors
  const [dateError, setDateError] = useState("");

  // Prepare circles data
  const extractCircleIds = (circlesData) => {
    if (!circlesData) return [];
    
    if (Array.isArray(circlesData)) {
      return circlesData.map(circle => {
        if (typeof circle === 'object' && circle !== null) {
          return circle.id;
        } else {
          return parseInt(circle, 10);
        }
      }).filter(id => !isNaN(id));
    }
    
    return [];
  };

  // New state for circles (tickbar) and selected circles.
  const [allCircles, setAllCircles] = useState([]); // full list of circles from API
  // Instead of ticking all circles by default, tick only the ones previously assigned
  const [selectedCircles, setSelectedCircles] = useState(extractCircleIds(eventData.circles) || []);

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

  // Fetch all circles on mount
  useEffect(() => {
    const loadCircles = async () => {
      try {
        const circlesData = await fetchCircles();
        if (circlesData) {
          // Keep all circle IDs that were already selected, even hidden ones
          const existingCircleIds = extractCircleIds(eventData.circles);
          
          // Filter circles for display, but keep track of any hidden circles that are already selected
          const visibleCircles = circlesData.filter(circle => !circle.is_hidden_from_sidebar);
          
          // Find hidden circles that were already selected
          const hiddenSelectedCircles = circlesData.filter(
            circle => circle.is_hidden_from_sidebar && existingCircleIds.includes(circle.id)
          );
          
          // If there are hidden selected circles, add them to visibleCircles for this form
          if (hiddenSelectedCircles.length > 0) {
            // Mark hidden circles specially so they can be rendered differently
            hiddenSelectedCircles.forEach(circle => {
              circle.is_previously_selected = true;
            });
            
            setAllCircles([...visibleCircles, ...hiddenSelectedCircles]);
          } else {
            setAllCircles(visibleCircles);
          }
        }
      } catch (err) {
        console.error("Error fetching circles:", err);
      }
    };
    loadCircles();
  }, [eventData.circles]);

  // Validate end date whenever start date or end date changes
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      validateDates(formData.start_time, formData.end_time);
    }
  }, [formData.start_time, formData.end_time]);

  // Validate that end date is not earlier than start date
  const validateDates = (startDate, endDate) => {
    if (!startDate || !endDate) return true;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      setDateError("End date cannot be earlier than start date");
      return false;
    } else {
      setDateError("");
      return true;
    }
  };

  // Add useEffect to update friendsOfFriendsAllowed when is_public changes
  useEffect(() => {
    // If event is public, automatically enable friends of friends
    if (formData.is_public === true) {
      setFriendsOfFriendsAllowed(true);
    }
  }, [formData.is_public]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // If public checkbox is checked, automatically enable friends of friends
    if (name === 'is_public' && checked === true) {
      setFriendsOfFriendsAllowed(true);
    }
    
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
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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

  // Handle change for friends-of-friends flag.
  const handleFriendsOfFriendsChange = (e) => {
    setFriendsOfFriendsAllowed(e.target.checked);
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

    // Validate dates
    if (formData.end_time && !validateDates(formData.start_time, formData.end_time)) {
      return; // Don't submit if dates are invalid
    }

    let updatedFields = {};
    
    // Add basic form fields that have changed
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== "" && formData[key] !== eventData[key]) {
        updatedFields[key] = formData[key];
      }
    });

    // Handle special case for WhatsApp link - if it's empty, set to null
    if (formData.whatsapp_group_link === "") {
      updatedFields.whatsapp_group_link = null;
    }
    
    // Handle special case for end time - if it's empty, set to null
    if (formData.end_time === "") {
      updatedFields.end_time = null;
    }

    // Handle address based on modified state
    if (removeAddress) {
      // If address was removed, set it to null
      updatedFields.address = null;
    } else if (addressModified && localizedAddress) {
      // If address was modified and localized, use the localized address
      updatedFields.address = { ...localizedAddress };
    }

    // Always include friends_of_friends_allowed flag
    updatedFields.friends_of_friends_allowed = friendsOfFriendsAllowed;
    
    // Always include shareable_link flag
    updatedFields.shareable_link = formData.shareable_link;
    
    // Format circles data properly for Django many-to-many relationship
    updatedFields.circle_ids = selectedCircles;

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
        className={styles.modalContentProject}
        style={{
          maxHeight: '85vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch', /* Enable smooth scrolling on iOS */
          scrollBehavior: 'smooth',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          /* Ensure immediate rendering without animations */
          animation: 'none',
          transition: 'none',
          borderRadius: '12px', /* Add rounded borders */
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' /* Enhanced shadow for better depth */
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
            /* Ensure immediate rendering without animations */
            animation: 'none',
            transition: 'none',
            borderTopLeftRadius: '12px', /* Match top corners */
            borderTopRightRadius: '12px'
          }}
        >
          <div className={styles.popupTitleWrapper}>
            <h3 className={styles.modalTitleProject}>Edit Project</h3>
          </div>
          <button onClick={handleCloseForm} className={styles.closeButtonProjectEnhanced}>
            ✕
          </button>
        </div>
        
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
            <label className={styles.formLabelProject}>Title:</label>
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
            <label className={styles.formLabelProject}>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.formTextareaProject}
              rows="4"
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
          
          <div className={styles.formGroupProject}>
            <label className={styles.formLabelProject}>Start Date:</label>
            <input
              type="datetime-local"
              name="start_time"
              value={formData.start_time}
              onChange={handleInputChange}
              className={styles.formInputProject}
              required
            />
            <small style={{ color: '#666', fontStyle: 'italic' }}>Add time if needed</small>
          </div>
          
          <div className={styles.formGroupProject}>
            <label className={styles.formLabelProject}>End Date:</label>
            <input
              type="datetime-local"
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
            <small style={{ color: '#666', fontStyle: 'italic' }}>Add time if needed</small>
          </div>
          
          <div className={styles.formGroupProject}>
            <label className={styles.formLabelProject}>Whatsapp Group Link (Optional):</label>
            <input
              type="url"
              name="whatsapp_group_link"
              value={formData.whatsapp_group_link}
              onChange={handleInputChange}
              className={styles.formInputProject}
              placeholder="https://chat.whatsapp.com/..."
            />
          </div>
          
          <div className={styles.checkboxContainerProject} style={{ marginBottom: '15px' }}>
            <input
              type="checkbox"
              id="is_public"
              name="is_public"
              checked={formData.is_public}
              onChange={handleInputChange}
              className={styles.checkboxInputProject}
            />
            <label htmlFor="is_public" className={styles.checkboxLabelProject}>Public</label>
          </div>
          
          <div className={styles.checkboxContainerProject} style={{ marginBottom: '20px' }}>
            <input
              type="checkbox"
              id="friends_of_friends_allowed"
              name="friends_of_friends_allowed"
              checked={friendsOfFriendsAllowed}
              onChange={handleFriendsOfFriendsChange}
              className={styles.checkboxInputProject}
            />
            <label htmlFor="friends_of_friends_allowed" className={styles.checkboxLabelProject}>
              Allow Friends of Friends
            </label>
          </div>
          
          <div className={styles.checkboxContainerProject} style={{ marginBottom: '20px' }}>
            <input
              type="checkbox"
              id="shareable_link"
              name="shareable_link"
              checked={formData.shareable_link}
              onChange={handleInputChange}
              className={styles.checkboxInputProject}
            />
            <label htmlFor="shareable_link" className={styles.checkboxLabelProject}>
              Shareable Link
            </label>
          </div>
          
          <fieldset 
            className={styles.fieldsetGroupProject}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}
          >
            <legend className={styles.fieldsetLegendProject}>Select Circles:</legend>
            
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
                {selectedCircles.length === allCircles.length ? "Deselect All" : "Select All"}
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
                padding: '5px',
                margin: '10px 0'
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
                  <label 
                    htmlFor={`circle-${circle.id}`} 
                    className={styles.checkboxLabelProject}
                    style={circle.is_previously_selected ? {
                      color: '#666',
                      fontStyle: 'italic',
                      display: 'flex',
                      alignItems: 'center'
                    } : {}}
                  >
                    {circle.name}
                    {circle.is_previously_selected && (
                      <span style={{ 
                        marginLeft: '5px', 
                        fontSize: '0.7rem', 
                        backgroundColor: '#f0f0f0',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        color: '#666'
                      }}>
                        invited
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
          
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
              borderBottomLeftRadius: '12px', /* Match bottom corners */
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
  );
};

export default EditEventForm;
