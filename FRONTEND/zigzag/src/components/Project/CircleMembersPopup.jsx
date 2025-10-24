import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserAlt, FaUserFriends, FaTimes } from 'react-icons/fa';
import styles from './Project.module.css';
import { fetchCircleMembers, fetchCircles } from '../../api/api';

// Component now only accepts an array of circle IDs
const CircleMembersPopup = ({ circleIds = [], circleName, onClose }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Whether we're showing multiple circles
  const isMultiCircle = circleIds.length > 1;

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!Array.isArray(circleIds) || circleIds.length === 0) {
          setMembers([]);
          setLoading(false);
          setError('Aucun cercle sélectionné');
          return;
        }

        // Check if this is an invitation circle (by name)
        const isInvitationCircle = circleName === 'Cercle invités' || circleName === 'Invités';
        
        let filteredCircleIds;
        
        if (isInvitationCircle) {
          // For invitation circles, skip accessibility check
          filteredCircleIds = [...new Set(circleIds)];
        } else {
          // For regular circles, use the existing accessibility check
          const userCircles = await fetchCircles(); // existing API call
          if (!userCircles || !Array.isArray(userCircles)) {
            throw new Error("Failed to fetch user circles");
          }

          // Extract IDs of circles user belongs to
          const accessibleCircleIds = userCircles.map(c => c.id);

          // Filter requested circles to only accessible ones
          const uniqueRequested = [...new Set(circleIds)];
          filteredCircleIds = uniqueRequested.filter(id => accessibleCircleIds.includes(id));

          // If no accessible circles found, show the "not part of circle" message
          if (filteredCircleIds.length === 0) {
            setMembers([]);
            setLoading(false);
            return;
          }
        }

        // Fetch members using filtered circle IDs
        const membersData = await fetchCircleMembers(filteredCircleIds);

        if (Array.isArray(membersData)) {
          setMembers(membersData);
        } else {
          console.error("Invalid data format:", membersData);
          setMembers([]);
          setError("Invalid data received from server");
        }
      } catch (error) {
        console.error("CircleMembersPopup: Error fetching circle members:", error);
        setError(error.message || "Error loading members");
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [circleIds]);

  // Format readable display name
  const formatDisplayName = (member) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    } else if (member.first_name) {
      return member.first_name;
    } else {
      return member.username;
    }
  };

  return (
    <div className={styles.modalOverlayProjectNoAnimation} onClick={(e) => {
      // Close when clicking the overlay background (not the popup itself)
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className={styles.circleMembersPopupProjectNoAnimation}>
        <div className={styles.popupHeaderProject}>
          <div className={styles.popupTitleWrapper}>
            <FaUserFriends className={styles.popupHeaderIcon} />
            <h3>
              {isMultiCircle
                ? `${circleIds.length} Cercles`
                : `${circleName || 'Cercle'}`}
            </h3>
          </div>
          <button onClick={onClose} className={styles.closeButtonProject}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.popupContentProject}>
          {loading ? (
            <div className={styles.loadingContainerProject}>
              <div className={styles.loadingSpinnerProjectNoAnimation}></div>
              <p>Chargement des invités...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainerProject}>
              <p>Erreur : {error}</p>
              <p>Veuillez réessayer plus tard.</p>
            </div>
          ) : members.length === 0 ? (
            <div className={styles.noMembersContainerProject}>
              <FaUserAlt className={styles.noMembersIcon} />
              <p>Tu ne fais pas partie de {isMultiCircle ? 'ces cercles' : 'ce cercle'}</p>
            </div>
          ) : (
            <>
              <div className={styles.memberCountProject}>
                <span>
                  {members.length} invité{members.length !== 1 ? 's' : ''}
                  {isMultiCircle ? ' de mes cercles' : ''}
                </span>
              </div>
              <ul className={styles.membersListProject}>
                {members.map((member, index) => (
                  <li key={member.id || index} className={styles.memberItemProject}>
                    <div className={styles.memberAvatarProject}>
                      {member.profile_image ? (
                        <img src={member.profile_image} alt={member.username} />
                      ) : (
                        <div className={styles.defaultAvatarProject}>
                          {(member.username || "User").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={styles.memberDetailsProject}>
                      <span className={styles.memberNameProject}>{formatDisplayName(member)}</span>
                      {member.username && member.username !== formatDisplayName(member) && (
                        <span className={styles.memberUsernameProject}>@{member.username}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CircleMembersPopup;
