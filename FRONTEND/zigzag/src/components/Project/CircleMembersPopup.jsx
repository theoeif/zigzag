import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserAlt, FaUserFriends, FaTimes } from 'react-icons/fa';
import styles from './Project.module.css';
import { fetchCircleMembers } from '../../api/api';

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
        if (!circleIds.length) {
          throw new Error("No circle IDs provided");
        }
                
        // Fetch members using the array of circle IDs
        const membersData = await fetchCircleMembers(circleIds);
        
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
              <p>Aucun invité trouvé dans {isMultiCircle ? 'ces cercles' : 'ce cercle'}</p>
            </div>
          ) : (
            <>
              <div className={styles.memberCountProject}>
                <span>{members.length} invité{members.length !== 1 ? 's' : ''}</span>
                {isMultiCircle && (
                  <span className={styles.circleGroupLabel}> 
                    de {circleIds.length} cercles
                  </span>
                )}
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