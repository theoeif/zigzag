import React, { useState, useEffect, useRef, useContext } from 'react';
import { fetchAddresses, addAddress, deleteAddress, updateAddressLabel, fetchUserProfile, updateProfile } from "../../api/api";
import Header from '../Header/Header';
import LeftMenu from '../LeftMenu/LeftMenu';
import { FaTrashAlt, FaCog, FaPlus, FaSave, FaCheck } from "react-icons/fa";
import AddressItem from './AddressItem';
import AddAddressPopup from './AddAddressPopup';
import styles from './Profile.module.css';
import { AuthContext } from '../../contexts/AuthProvider';
import ProofileItem from './ProfileItem';

const labelSuggestions = ["Localisation d'Amis", "Travail", "Résidence Secondaire"];

const Profile = () => {
  // Get logout function from auth context
  const { logout } = useContext(AuthContext);

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
  const [remoteDays, setRemoteDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
    Sunday: false
  });
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
          setRemoteDays(profileResponse.profile.remote_days || remoteDays);
          setLookingFor(profileResponse.profile.looking_for || "");
        }

        if (addressesResponse) {
          setAddresses(addressesResponse);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMessage("Échec du chargement des données du profil");
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
          remote_days: remoteDays,
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
      setErrorMessage("Échec de la sauvegarde des modifications du profil");
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
      setErrorMessage("Échec de l'ajout de l'adresse");
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

  // Clear a specific day's time range
  const handleClearDay = (day) => {
    const newTimetable = {
      ...timetable,
      [day]: { start: null, end: null }
    };
    setTimetable(newTimetable);
    setSelectedDay(null);
  };

  // Removed loading check - render content immediately

  return (
    <div className={styles.profilePage}>
      <Header toggleLeftMenu={toggleLeftMenu} />


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
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Mes localisations</h2>
            <button onClick={() => setIsManageMode(!isManageMode)} className={styles.manageButton}>
              <FaCog /> Gérer
            </button>
          </div>
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

        <ProofileItem
          timetable={timetable}
          remoteDays={remoteDays}
          lookingFor={lookingFor}
          readOnly={false}
          selectedDay={selectedDay}
          onSelectDay={(day) => setSelectedDay(day)}
          startTime={startTime}
          endTime={endTime}
          onChangeStartTime={(val) => setStartTime(val)}
          onChangeEndTime={(val) => setEndTime(val)}
          onSaveTimeRange={handleTimeRangeSave}
          onCancelSelectDay={() => setSelectedDay(null)}
          onToggleRemoteDay={handleRemoteDayClick}
          onChangeLookingFor={(val) => setLookingFor(val)}
          onClearDay={handleClearDay}
        />
      </div>

      {/* Floating save button - hidden when AddAddressPopup is open */}
      {!showAddAddressPopup && (
        <button
          onClick={handleSaveProfile}
          className={`${styles.saveButton} ${saveStatus ? styles[saveStatus] : ''}`}
          disabled={saveStatus === 'saving' || saveStatus === 'saved'}
        >
          {saveStatus === 'saving' ? (
            <>Sauvegarde...</>
          ) : saveStatus === 'saved' ? (
            <><FaCheck className={styles.checkmark} /> Sauvegardé !</>
          ) : (
            <><FaSave /> Sauvegarder</>
          )}
        </button>
      )}
    </div>
  );
};

export default Profile;
