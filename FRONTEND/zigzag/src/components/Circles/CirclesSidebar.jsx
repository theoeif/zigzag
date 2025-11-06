// File: components/Circles/CirclesSidebar.jsx
import React, { useEffect, useState } from 'react';
import { fetchCircles, fetchMyTags, fetchAddCircle } from '../../api/api';
import styles from './Circle.module.css';
import { FiX, FiCheck, FiTag, FiUsers, FiPlus } from 'react-icons/fi';
import StarIcon from '@mui/icons-material/Star';

const AddCircleModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTags() {
      try {
        const tagsData = await fetchMyTags();
        setTags(tagsData);
      } catch (err) {
        setError('Échec du chargement des tags');
      }
    }
    loadTags();
  }, []);

  const validateForm = () => {
    if (!name.trim()) return 'Le nom du cercle est obligatoire';
    if (selectedTags.length === 0) return 'Au moins une catégorie doit être sélectionnée';
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
        categories: selectedTags.map(tag => tag.id) // Send tag IDs instead of names
      };
      const createdCircle = await fetchAddCircle(newCircle);
      if (createdCircle) {
        onCreate(createdCircle);
        onClose();
      }
      } catch (err) {
        setError('Échec de la création du cercle. Veuillez réessayer.');
      }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Nouveau Cercle</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            <FiUsers className={styles.inputIcon} />
            Nom du Cercle
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Entrez le nom du cercle"
            className={styles.textInput}
          />
        </div>


        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            <FiTag className={styles.inputIcon} />
            Tags (Obligatoire)
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
            Créer le Cercle
          </button>
        </div>
      </div>
    </div>
  );
};

const CirclesSidebar = ({ onSelectCircle, selectedCircleId, onCircleRemoved }) => {
  const [circles, setCircles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCircles = async () => {
    setIsLoading(true);
    const data = await fetchCircles();
    if (data) {
      setCircles(data);
    }
    setIsLoading(false);
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

  const handleRemoveCircle = (circleId) => {
    setCircles(prev => prev.filter(circle => circle.id !== circleId));
  };

  // Expose handleRemoveCircle to parent via callback prop
  useEffect(() => {
    if (onCircleRemoved) {
      onCircleRemoved(handleRemoveCircle);
    }
  }, [onCircleRemoved]);

  // Filter out invitation circles and combine all into single list
  const regularCircles = circles.filter(circle => !circle.is_invitation_circle);

  return (
    <div className={styles.circlesSidebar}>
      <div className={styles.circlesList}>
        {regularCircles.length > 0 && (
          <ul className={styles.circlesSubList}>
            {regularCircles.map(circle => (
              <li
                key={circle.id}
                className={`${styles.circleItem} ${circle.id === selectedCircleId ? styles.selected : ''}`}
                onClick={() => onSelectCircle(circle)}
              >
                {circle.name}
                {circle.is_creator && (
                  <StarIcon 
                    sx={{ 
                      fontSize: 16, 
                      color: 'rgba(0, 0, 0, 0.54)',
                      ml: 0.5,
                      verticalAlign: 'middle'
                    }} 
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Button at the end of the list - only show when loaded */}
        {!isLoading && (
          <div className={styles.buttonContainer}>
            <button
              className={styles.addCircleButton}
              onClick={() => setShowModal(true)}
            >
              <FiPlus size={20} />
            </button>
          </div>
        )}
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
