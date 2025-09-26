// File: components/Circles/CirclesSidebar.jsx
import React, { useEffect, useState } from 'react';
import { fetchCircles, fetchMyTags, fetchAddCircle, fetchUserProfile } from '../../api/api';
import styles from './Circle.module.css';
import { FiX, FiCheck, FiTag, FiUsers, FiPlus } from 'react-icons/fi';

const AddCircleModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(true);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTags() {
      try {
        const tagsData = await fetchMyTags();
        setTags(tagsData);
      } catch (err) {
        setError('Failed to load tags');
      }
    }
    loadTags();
  }, []);

  const validateForm = () => {
    if (!name.trim()) return 'Circle name is required';
    if (selectedTags.length === 0) return 'At least one category must be selected';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const newCircle = {
        name: name.trim(),
        is_shared: isShared,
        tags: selectedTags.map(tag => tag.name)
      };
      const createdCircle = await fetchAddCircle(newCircle);
      if (createdCircle) {
        onCreate(createdCircle);
        onClose();
      }
    } catch (err) {
      setError('Failed to create circle. Please try again.');
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create New Circle</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            <FiUsers className={styles.inputIcon} />
            Circle Name
          </label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Enter circle name"
            className={styles.textInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom}></span>
            Shared with members
          </label>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            <FiTag className={styles.inputIcon} />
            Tags (Required)
          </label>
          <div className={styles.tagsContainer}>
            {tags.map(tag => (
              <button
                key={tag.id}
                type="button"
                className={`${styles.tag} ${
                  selectedTags.some(t => t.id === tag.id) ? styles.tagSelected : ''
                }`}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.some(t => t.id === tag.id)
                      ? prev.filter(t => t.id !== tag.id)
                      : [...prev, tag]
                  );
                  setError('');
                }}
              >
                {tag.name}
                {selectedTags.some(t => t.id === tag.id) && (
                  <FiCheck className={styles.tagCheck} />
                )}
              </button>
            ))}
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.modalActions}>
          <button 
            className={styles.createButton}
            onClick={handleSubmit}
            disabled={!name.trim() || selectedTags.length === 0}
          >
            Create Circle
          </button>
        </div>
      </div>
    </div>
  );
};

const CirclesSidebar = ({ onSelectCircle, selectedCircleId }) => {
  const [circles, setCircles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const loadCircles = async () => {
    const data = await fetchCircles();
    const userProfile = await fetchUserProfile();
    if (data && userProfile) {
      setCircles(data);
      setCurrentUser(userProfile);
    }
  };

  useEffect(() => {
    loadCircles();
    
    const handleRefresh = () => {
      loadCircles();
    };
    window.addEventListener('refreshCircles', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshCircles', handleRefresh);
    };
  }, []);

  const handleCreateCircle = (newCircle) => {
    setCircles(prev => [...prev, newCircle]);
    onSelectCircle(newCircle);
  };

  // Separate circles into private and shared
  const privateCircles = circles.filter(circle =>
    !circle.is_shared &&
    circle.creator === currentUser?.username
  );
  const sharedCircles = circles.filter(circle =>
    (circle.is_shared || (circle.creator !== currentUser?.username))
  );

  return (
    <div className={styles.circlesSidebar}>
      <div className={styles.circlesList}>
        {privateCircles.length > 0 && (
          <>
            <div className={styles.circleCategory}>Private Circles</div>
            <ul className={styles.circlesSubList}>
              {privateCircles.map(circle => (
                <li 
                  key={circle.id}
                  className={`${styles.circleItem} ${circle.id === selectedCircleId ? styles.selected : ''}`}
                  onClick={() => onSelectCircle(circle)}
                >
                  {circle.name}
                </li>
              ))}
            </ul>
          </>
        )}

        {sharedCircles.length > 0 && (
          <>
            <div className={styles.circleCategory}>Shared Circles</div>
            <ul className={styles.circlesSubList}>
              {sharedCircles.map(circle => (
                <li 
                  key={circle.id}
                  className={`${styles.circleItem} ${circle.id === selectedCircleId ? styles.selected : ''}`}
                  onClick={() => onSelectCircle(circle)}
                >
                  {circle.name}
                </li>
              ))}
            </ul>
          </>
        )}
        
        <div style={{ height: "30px" }}></div>
        <button 
          className={styles.addCircleButton}
          onClick={() => setShowModal(true)}
        >
          <FiPlus size={16} style={{ marginRight: '6px' }} /> Add Circle
        </button>
      </div>

      {showModal && (
        <AddCircleModal 
          onClose={() => setShowModal(false)}
          onCreate={handleCreateCircle}
        />
      )}
    </div>
  );
};

export default CirclesSidebar;
