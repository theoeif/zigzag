import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createEvent, fetchCircles } from '../../api/api';
import styles from './Project.module.css';

const OPEN_CAGE_API_KEY = "a51c63b182214f16ba4d28f56b0f191f";

const CreateEventForm = ({ projectId, onEventCreated, onClose }) => {
  // Get current date and time in local timezone, formatted for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(now.getDate()).padStart(2, '0');
    
    // Set time to 00:00 (midnight) for date-only value
    return `${year}-${month}-${day}T00:00`;
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
    whatsapp_group_link: '',
    is_public: false,
    shareable_link: true,  // Default to true - link is shareable
  });

  // State for tracking if the form should be shown
  const [showForm, setShowForm] = useState(true);
  
  // State for friends-of-friends flag
  const [friendsOfFriendsAllowed, setFriendsOfFriendsAllowed] = useState(false);

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
          // Filter out circles that are hidden from sidebar
          const visibleCircles = circlesData.filter(circle => !circle.is_hidden_from_sidebar);
          setAllCircles(visibleCircles);
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

  // Update friends-of-friends when is_public changes
  useEffect(() => {
    // If event is public, automatically enable friends of friends
    if (formData.is_public === true) {
      setFriendsOfFriendsAllowed(true);
    }
  }, [formData.is_public]);

  // Handle change for all text/select/checkbox inputs except circles
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
      setEndDateManuallyChanged(true);
      
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

  // Localize address using OpenCage Geocoding API
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
        setLocalizeError("Address could not be localized. Is it correct?");
      }
    } catch (error) {
      console.error("Localization error:", error);
      setLocalizeError("An error occurred during localization.");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate address is not empty
    if (!formData.address_line.trim()) {
      setAddressError("Address is required");
      return;
    }
    
    // Validate that address is localized
    if (!localizedAddress) {
      setAddressError("Please localize the address first");
      return;
    }
    
    // Validate dates
    if (formData.end_time && !validateDates(formData.start_time, formData.end_time)) {
      return; // Don't submit if dates are invalid
    }
    
    const eventData = {
      title: formData.title,
      description: formData.description,
      address: localizedAddress,
      start_time: formData.start_time,
      end_time: formData.end_time || null,
      whatsapp_group_link: formData.whatsapp_group_link || null,
      is_public: formData.is_public,
      friends_of_friends_allowed: friendsOfFriendsAllowed,
      shareable_link: formData.shareable_link,
      project: projectId,
      circle_ids: selectedCircles,
    };
    
    try {
      const createdEvent = await createEvent(eventData);
      
      // Close form and notify parent component
      setShowForm(false);
      
      if (onEventCreated) {
        onEventCreated(createdEvent);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error creating event:", error);
      
      let errorMessage = "Error creating event";
      
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
          borderRadius: '12px', /* Add rounded borders for all corners */
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
            <h3 className={styles.modalTitleProject}>Create New Project</h3>
          </div>
          <button onClick={onClose} className={styles.closeButtonProjectEnhanced}>
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
            <label className={styles.formLabelProject}>Address:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                name="address_line"
                value={formData.address_line}
                onChange={handleInputChange}
                className={`${styles.formInputProject} ${addressError ? styles.inputErrorProject : ''}`}
                style={{ flexGrow: 1 }}
                placeholder="Enter the event location"
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
                Localize
              </button>
            </div>
            {addressError && <p className={styles.errorMessageProject}>{addressError}</p>}
          </div>
          
          {localizeError && <p className={styles.errorMessageProject}>{localizeError}</p>}
          
          {localizedAddress && (
            <div 
              className={styles.localizedInfoProject}
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                padding: '12px 15px',
                marginBottom: '15px',
                fontSize: '0.9rem',
                maxHeight: '150px',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
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
            {dateError ? (
              <p style={{ color: '#d32f2f', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                {dateError}
              </p>
            ) : (
              <small style={{ color: '#40916c', fontStyle: 'italic' }}>
                {!endDateManuallyChanged && "3 months after by default"}
              </small>
            )}
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
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventForm;
