import React, { useEffect, useState } from 'react';
import { fetchProfile } from '../../api/api';
import ProfileItem from '../Profile/ProfileItem';
import styles from './Circle.module.css';

const UserProfileView = ({ userId }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract username from the member object (userId is actually the full member object)
  const username = userId?.username;

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) {
        setError('Nom d\'utilisateur non fourni');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const profileData = await fetchProfile(username);
        setProfile(profileData);
        setError(null);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  if (loading) {
    return (
      <div className={styles.userProfileContainer}>
        <div className={styles.loadingContainer}>
          <p>Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.userProfileContainer}>
        <div className={styles.errorContainer}>
          <p>Erreur: {error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.userProfileContainer}>
        <div className={styles.errorContainer}>
          <p>Profil non trouvé</p>
        </div>
      </div>
    );
  }

  // Extract profile data with defaults
  const timetable = profile?.profile?.timetable || {
    Monday: { start: null, end: null },
    Tuesday: { start: null, end: null },
    Wednesday: { start: null, end: null },
    Thursday: { start: null, end: null },
    Friday: { start: null, end: null },
    Saturday: { start: null, end: null },
    Sunday: { start: null, end: null },
  };

  const remoteDays = profile?.profile?.remote_days || {
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
    Sunday: false,
  };

  const lookingFor = profile?.profile?.looking_for || "";

  return (
    <div className={styles.userProfileContainer}>
      <div className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>
          {profile?.username || "Profil"}
        </h1>
        <p className={styles.profileSubtitle}>
          {profile?.first_name} {profile?.last_name}
        </p>
      </div>

      <div className={styles.profileContent}>
        <ProfileItem
          timetable={timetable}
          remoteDays={remoteDays}
          lookingFor={lookingFor}
          readOnly={true}
        />
      </div>
    </div>
  );
};

export default UserProfileView;
