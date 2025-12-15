import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../../contexts/AuthProvider';
import { Close as CloseIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import styles from './ZigZagConceptPopup.module.css';

// Zigzag SVG Pattern Component
const ZigzagPattern = ({ className = '', animate = true }) => {
  return (
    <svg
      className={`${styles.zigzagPattern} ${animate ? styles.zigzagAnimated : ''} ${className}`}
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0,10 L10,0 L20,10 L30,0 L40,10 L50,0 L60,10 L70,0 L80,10 L90,0 L100,10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

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
        {/* Animated zigzag background */}
        <div className={styles.zigzagBackground}>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className={styles.zigzagRow}
              initial={{ x: i % 2 === 0 ? "-50%" : "0%" }}
              animate={{ x: i % 2 === 0 ? "0%" : "-50%" }}
              transition={{
                duration: 20 + i * 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear",
              }}
              style={{ top: `${i * 12}%` }}
            >
              <ZigzagPattern animate={false} />
            </motion.div>
          ))}
        </div>

        {/* Close button */}
        <button className={styles.closeButton} onClick={handleClose} aria-label="Fermer">
          <CloseIcon />
        </button>

        {/* Content */}
        <div className={styles.content}>
          {/* Main text with animations */}
          <motion.div 
            className={styles.mainText}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <motion.p 
              className={styles.introText}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              LA VIE NE VA
              <br />
              <span className={styles.highlightWord}>JAMAIS</span>
              <br />
              <span className={styles.primaryText}>DROIT</span>
            </motion.p>
            <motion.p 
              className={styles.descriptionText}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Elle avance en zigzag. ZigZag crée et partage des projets, ancrés dans les territoires, qui échappent aux cadre classiques
            </motion.p>
          </motion.div>

          {/* Expandable section */}
          {isExpanded && (
            <motion.div 
              className={styles.expandedContent}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.4 }}
            >
              <p className={styles.expandedText}>
                ZigZag n'est pas anti-système. Il existe parce que le système — avec toute sa bonne volonté — ne peut pas agir partout. Il y a des espaces qu'il ne voit pas, des besoins qu'il ne comprend pas, des solutions qu'il ne sait pas imaginer.
              </p>
              <p className={styles.expandedText}>
                C'est dans ces interstices que ZigZag opère. Pour relier les initiatives locales, donner à voir ce qui se fait, permettre à d'autres de s'en inspirer ou de s'y joindre.
              </p>
            </motion.div>
          )}

          {/* Expand/Collapse button */}
          <motion.button 
            className={styles.expandButton} 
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
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
          </motion.button>

          {/* Advice section */}
          <motion.div 
            className={styles.adviceSection}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className={styles.adviceText}>
              💡 <strong>Pour commencer :</strong>
            </p>
            <ul className={styles.adviceList}>
              <li>Créez un compte via le panneau de gauche</li>
              <li>Consultez la section d'aide (?) dans le panneau de gauche pour apprendre à utiliser l'app</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ZigZagConceptPopup;
