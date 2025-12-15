import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthProvider';
import { Close as CloseIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import styles from './ZigZagConceptPopup.module.css';

const ZigZagConceptPopup = ({ isBackground = false, onClose }) => {
  const { isConnected } = useContext(AuthContext);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Check if popup should be shown
  useEffect(() => {
    if (isBackground || isConnected) {
      setIsVisible(false);
      return;
    }

    // Check localStorage to see if popup was dismissed
    const dismissed = localStorage.getItem('zigzag_concept_popup_dismissed') === 'true';
    setIsVisible(!dismissed);
  }, [isConnected, isBackground]);

  // Lock body scroll when popup is visible
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('popup-open');
    } else {
      document.body.classList.remove('popup-open');
    }

    return () => {
      document.body.classList.remove('popup-open');
    };
  }, [isVisible]);

  const handleClose = () => {
    // Save dismissal to localStorage
    localStorage.setItem('zigzag_concept_popup_dismissed', 'true');
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    // Close only if clicking on the overlay itself, not the popup content
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={handleClose} aria-label="Fermer">
          <CloseIcon />
        </button>

        {/* Content */}
        <div className={styles.content}>
          {/* Main text */}
          <div className={styles.mainText}>
            <p className={styles.introText}>
              La vie ne va jamais droit. Elle avance en zigzag.
            </p>
            <p className={styles.descriptionText}>
              ZigZag crée et partage des projets, ancrés dans les territoires, là où le système ne peut pas aller seul.
            </p>
          </div>

          {/* Expandable section */}
          {isExpanded && (
            <div className={styles.expandedContent}>
              <p className={styles.expandedText}>
                ZigZag n'est pas anti-système. Il existe parce que le système — avec toute sa bonne volonté — ne peut pas agir partout. Il y a des espaces qu'il ne voit pas, des besoins qu'il ne comprend pas, des solutions qu'il ne sait pas imaginer.
              </p>
              <p className={styles.expandedText}>
                C'est dans ces interstices que ZigZag opère. Pour relier les initiatives locales, donner à voir ce qui se fait, permettre à d'autres de s'en inspirer ou de s'y joindre.
              </p>
            </div>
          )}

          {/* Expand/Collapse button */}
          <button 
            className={styles.expandButton} 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <span>Voir moins</span>
                <ExpandLessIcon className={styles.expandIcon} />
              </>
            ) : (
              <>
                <span>En savoir plus</span>
                <ExpandMoreIcon className={styles.expandIcon} />
              </>
            )}
          </button>

          {/* Advice section */}
          <div className={styles.adviceSection}>
            <p className={styles.adviceText}>
              💡 <strong>Pour commencer :</strong>
            </p>
            <ul className={styles.adviceList}>
              <li>Créez un compte via le panneau de gauche</li>
              <li>Consultez la section d'aide (?) dans le panneau de gauche pour apprendre à utiliser l'app</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZigZagConceptPopup;
