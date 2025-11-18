import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { fetchProfile } from "../../api/api";
import styles from "./Profile.module.css";
import ProofileItem from "./ProfileItem";
import Header from '../Header/Header';
import LeftMenu from '../LeftMenu/LeftMenu';

const emptyTimetable = {
  Monday: { start: null, end: null },
  Tuesday: { start: null, end: null },
  Wednesday: { start: null, end: null },
  Thursday: { start: null, end: null },
  Friday: { start: null, end: null },
  Saturday: { start: null, end: null },
  Sunday: { start: null, end: null },
};

const defaultRemoteDays = {
  Monday: false,
  Tuesday: false,
  Wednesday: false,
  Thursday: false,
  Friday: false,
  Saturday: false,
  Sunday: false,
};

const ProfilePage = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await fetchProfile(username);
        setProfile(profileData);
      } catch (err) {
        setError(err);
      }
    };

    loadProfile();
  }, [username]);

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

  if (error) return <div>Error: {String(error)}</div>;

  // Use profile data if available, otherwise use defaults
  const timetable = profile?.profile?.timetable || emptyTimetable;
  const remoteDaysCount = profile?.profile?.remote_days_count ?? 0;
  const remoteDays = profile?.profile?.remote_days || defaultRemoteDays;
  const lookingFor = profile?.profile?.looking_for || "";

  return (
    <div className={styles.profilePage}>
      <Header toggleLeftMenu={toggleLeftMenu} />

      <div className={styles.manageButtonContainer}>
        <h1 style={{
          margin: 0,
          color: '#0981D1',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          textAlign: 'left'
        }}>
          {profile?.username || username || "Profil"}
        </h1>
      </div>

      {isLeftMenuOpen && (
        <div ref={menuRef} className="left-menu">
          <LeftMenu closeMenu={() => setIsLeftMenuOpen(false)} />
        </div>
      )}

      <div className={styles.sectionsContainerProfilePage}>
        <ProofileItem
          timetable={timetable}
          remoteDaysCount={remoteDaysCount}
          remoteDays={remoteDays}
          lookingFor={lookingFor}
          readOnly={true}
        />
      </div>
    </div>
  );
};

export default ProfilePage;
