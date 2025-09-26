
import React, { useState, useEffect, useRef } from 'react';
import { fetchAddresses, addAddress, deleteAddress, fetchUserProfile, updateProfile } from "../../api/api";
import Header from '../Header/Header';
import LeftMenu from '../LeftMenu/LeftMenu';
import { FaTrashAlt, FaCog, FaPlus, FaSave, FaCheck } from "react-icons/fa";
import AddressItem from './AddressItem';
import AddAddressPopup from './AddAddressPopup';
import styles from './Profile.module.css';

const labelSuggestions = ["Home", "Work", "Secondary Residence"];

const Profile = () => {
  // Profile data state
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  // Address-related states
  const [addresses, setAddresses] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isManageMode, setIsManageMode] = useState(false);
  const [showAddAddressPopup, setShowAddAddressPopup] = useState(false);
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);

  // Availability-related states
  const [timetable, setTimetable] = useState({
    Monday: { start: null, end: null },
    Tuesday: { start: null, end: null },
    Wednesday: { start: null, end: null },
    Thursday: { start: null, end: null },
    Friday: { start: null, end: null },
    Saturday: { start: null, end: null },
    Sunday: { start: null, end: null },
  });
  const [remoteDaysCount, setRemoteDaysCount] = useState(2);
  const [remoteDays, setRemoteDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
    Sunday: false
  });
  const today = new Date().toISOString().split("T")[0];
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  const futureDate = sixMonthsLater.toISOString().split("T")[0];
  const [vacationDays, setVacationDays] = useState(0);
  const [vacationStart, setVacationStart] = useState(today);
  const [vacationEnd, setVacationEnd] = useState(futureDate);
  const [selectedDay, setSelectedDay] = useState(null);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("23:00");
  const [lookingFor, setLookingFor] = useState("");

  const menuRef = useRef(null);

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [profileResponse, addressesResponse] = await Promise.all([
          fetchUserProfile(),
          fetchAddresses()
        ]);

        if (profileResponse) {
          setProfileData(profileResponse);
          // Update local state with profile data
          setTimetable(profileResponse.profile.timetable || timetable);
          setRemoteDaysCount(profileResponse.profile.remote_days_count || 2);
          setRemoteDays(profileResponse.profile.remote_days || remoteDays);
          setVacationDays(profileResponse.profile.vacation_days_remaining || 0);
          setVacationStart(profileResponse.profile.vacation_start || today);
          setVacationEnd(profileResponse.profile.vacation_end || futureDate);
          setLookingFor(profileResponse.profile.looking_for || "");
        }

        if (addressesResponse) {
          setAddresses(addressesResponse);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMessage("Failed to load profile data");
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      setSaveStatus('saving');
      const profileUpdateData = {
        profile: {
          timetable,
          remote_days_count: remoteDaysCount,
          remote_days: remoteDays,
          vacation_days_remaining: vacationDays,
          vacation_start: vacationStart,
          vacation_end: vacationEnd,
          looking_for: lookingFor
        }
      };

      const updatedProfile = await updateProfile(profileUpdateData);
      if (updatedProfile) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveStatus('error');
      setErrorMessage("Failed to save profile changes");
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  // Menu handling functions
  const toggleLeftMenu = () => setIsLeftMenuOpen(prev => !prev);
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInside = e.target.closest(".left-menu") || e.target.closest(".left-menu-icon");
      if (!isClickInside) setIsLeftMenuOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isLeftMenuOpen]);

  // Handle adding a new address through the popup
  const handleAddAddress = async (addressData) => {
    try {
      const newAddressData = await addAddress(addressData);
      if (newAddressData) {
        setAddresses(prev => [...prev, newAddressData]);
        setErrorMessage("");
      }
    } catch (error) {
      console.error("Error adding address:", error);
      setErrorMessage("Failed to add address");
    }
  };

  const handleLabelUpdate = async (addressId, newLabel) => {
    const updated = await updateAddressLabel(addressId, newLabel);
    if (updated) {
      setAddresses(prev => prev.map(addr => 
        addr.id === addressId ? { ...addr, label: newLabel } : addr
      ));
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (await deleteAddress(addressId)) {
      setAddresses(prev => prev.filter(addr => addr.id !== addressId));
    }
  };

  // Updated availability handling functions
  const handleRemoteDayClick = (day) => {
    // Only allow clicking when not in time editing mode
    if (selectedDay === null) {
      const newRemoteDays = { ...remoteDays, [day]: !remoteDays[day] };
      setRemoteDays(newRemoteDays);
    }
  };

  const handleTimeRangeSave = () => {
    if (selectedDay) {
      const newTimetable = {
        ...timetable,
        [selectedDay]: { start: startTime, end: endTime }
      };
      setTimetable(newTimetable);
      setSelectedDay(null);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.profilePage}>
      <Header toggleLeftMenu={toggleLeftMenu} />

      <div className={styles.manageButtonContainer}>
        <button onClick={() => setIsManageMode(!isManageMode)} className={styles.manageButton}>
          <FaCog /> Manage
        </button>
      </div>

      {errorMessage && (
        <div className={styles.errorBanner}>
          {errorMessage}
          <button onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}

      {isLeftMenuOpen && (
        <div ref={menuRef} className="left-menu">
          <LeftMenu closeMenu={() => setIsLeftMenuOpen(false)} />
        </div>
      )}

      <div className={styles.sectionsContainer}>
        {/* Address Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>My locations (where I have friends) </h2>
          <div className={styles.addressList}>
            {addresses.map(addr => (
              <AddressItem
                key={addr.id}
                address={addr}
                isManageMode={isManageMode}
                onLabelUpdate={handleLabelUpdate}
                onDelete={handleDeleteAddress}
              />
            ))}
          </div>

          <div className={styles.addAddressSection}>
            <button 
              onClick={() => setShowAddAddressPopup(true)} 
              className={styles.addButton}
              aria-label="Add new address"
            >
              <FaPlus />
            </button>
          </div>
          
          {/* Address Popup */}
          {showAddAddressPopup && (
            <AddAddressPopup 
              onClose={() => setShowAddAddressPopup(false)}
              onAddAddress={handleAddAddress}
            />
          )}
        </section>

        {/* Availability Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Availability</h2>
          
          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>Timetable</h3>
            <div className={styles.timetable}>
              {Object.keys(timetable).map(day => (
                <div key={day} className={styles.timetableDay} onClick={() => setSelectedDay(day)}>
                  <h4>{day}</h4>
                  <p>{timetable[day].start ? `${timetable[day].start} - ${timetable[day].end}` : "Set time range"}</p>
                </div>
              ))}
            </div>
          </div>

          {selectedDay && (
            <div className={styles.timeRangePickerModal}>
              <div className={styles.timeRangePicker}>
                <h4>Set Time for {selectedDay}</h4>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                <div className={styles.buttonContainer}>
                  <button onClick={handleTimeRangeSave}>Save</button>
                  <button onClick={() => setSelectedDay(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Remote Work Section */}
          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>Remote Work</h3>
            <div className={styles.remoteWorkSection}>
              <label className={styles.remoteDaysLabel}>
                <span>Remote Days / Week:</span>
                <input
                  type="number"
                  value={remoteDaysCount}
                  onChange={(e) => setRemoteDaysCount(Math.max(0, Math.min(7, parseInt(e.target.value, 10))))}
                  min="0"
                  max="7"
                  className={styles.remoteDaysInput}
                  disabled={selectedDay !== null}
                />
              </label>
              <div className={styles.remoteDaysBar}>
                {Object.keys(remoteDays).map((day) => (
                  <div 
                    key={day} 
                    className={`${styles.remoteDay} ${remoteDays[day] ? styles.active : ""} ${selectedDay !== null ? styles.disabled : ""}`} 
                    onClick={() => handleRemoteDayClick(day)}
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vacation Section */}
          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>Vacation</h3>
            <div className={styles.vacationContainer}>
              <label>From:</label>
              <input 
                type="date" 
                value={vacationStart} 
                onChange={(e) => setVacationStart(e.target.value)} 
                className={styles.dateInput} 
              />
              <label>To:</label>
              <input 
                type="date" 
                value={vacationEnd} 
                onChange={(e) => setVacationEnd(e.target.value)} 
                className={styles.dateInput} 
              />
              <input 
                type="number" 
                value={vacationDays} 
                onChange={(e) => setVacationDays(Math.max(0, parseInt(e.target.value, 10)))} 
                min="0" 
                className={styles.vacationInput} 
              />
              <span>Days Remaining</span>
            </div>
          </div>
        </section>

        {/* "What Are You Looking For?" Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What Are You Looking For?</h2>
          <textarea
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            className={styles.lookingForInput}
            placeholder="Describe what you're looking for..."
            rows={4}
          />
        </section>
      </div>

      {/* Floating save button */}
      <button 
        onClick={handleSaveProfile} 
        className={`${styles.saveButton} ${saveStatus ? styles[saveStatus] : ''}`}
        disabled={saveStatus === 'saving' || saveStatus === 'saved'}
      >
        {saveStatus === 'saving' ? (
          <>Saving...</>
        ) : saveStatus === 'saved' ? (
          <><FaCheck className={styles.checkmark} /> Saved!</>
        ) : (
          <><FaSave /> Save Changes</>
        )}
      </button>
    </div>
  );
};

export default Profile;