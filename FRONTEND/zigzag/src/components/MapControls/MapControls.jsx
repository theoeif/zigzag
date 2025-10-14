import React, { useState, useEffect, useRef } from 'react';
import { useMediaQuery } from '@mui/material';
import styles from './MapControls.module.css';

const MapControls = ({
  timeframe,
  onTimeChange,
  onCreateProject,
  isBackground = false
}) => {
  const isSmallScreen = useMediaQuery('(max-width:599px)');

  // Date range picker state
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const datePopoverRef = useRef(null);

  // Draft date range values for the popover (YYYY-MM-DD)
  const [draftStart, setDraftStart] = useState(() => timeframe.start.toISOString().slice(0, 10));
  const [draftEnd, setDraftEnd] = useState(() => timeframe.end.toISOString().slice(0, 10));

  // Keep draft dates in sync when timeframe changes
  useEffect(() => {
    setDraftStart(timeframe.start.toISOString().slice(0, 10));
    setDraftEnd(timeframe.end.toISOString().slice(0, 10));
  }, [timeframe.start, timeframe.end]);

  // Close date popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePopoverRef.current && !datePopoverRef.current.contains(e.target)) {
        setIsDatePopoverOpen(false);
      }
    };
    if (isDatePopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePopoverOpen]);

  // Date range picker functions
  const applyDateRange = () => {
    const start = new Date(draftStart);
    const end = new Date(draftEnd);
    if (isNaN(start) || isNaN(end) || start > end) return;

    onTimeChange({ start, end });
    setIsDatePopoverOpen(false);
  };

  const resetRange = () => {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    onTimeChange({ start, end });
    setIsDatePopoverOpen(false);
  };

  if (isBackground) {
    return null;
  }

  return (
    <div
      ref={datePopoverRef}
      className={`${styles.container} ${isSmallScreen ? styles.containerMobile : ''}`}
    >
      {/* Combined Create Project and Date Range Button */}
      <div className={`${styles.controlsWrapper} ${isSmallScreen ? styles.controlsWrapperMobile : ''}`}>
        {/* Create Project Button */}
        <button
          onClick={onCreateProject}
          className={`${styles.createButton} ${isSmallScreen ? styles.createButtonMobile : ''}`}
          title="Créer un projet"
        >
          +
        </button>

        {/* Date Range Picker Button */}
        <button
          onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
          className={`${styles.dateButton} ${isSmallScreen ? styles.dateButtonMobile : ''}`}
          title="Filtrer par date"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={isSmallScreen ? '14' : '16'} height={isSmallScreen ? '14' : '16'} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          <span className={`${styles.dateText} ${isSmallScreen ? styles.dateTextMobile : ''}`}>
            {draftStart} → {draftEnd}
          </span>
        </button>
      </div>

      {/* Date Range Popover */}
      {isDatePopoverOpen && (
        <div className={`${styles.popover} ${isSmallScreen ? styles.popoverMobile : ''}`}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              Début
            </label>
            <input
              type="date"
              value={draftStart}
              max={draftEnd}
              onChange={e => setDraftStart(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              Fin
            </label>
            <input
              type="date"
              value={draftEnd}
              min={draftStart}
              onChange={e => setDraftEnd(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.buttonGroup}>
            <button
              onClick={resetRange}
              className={styles.resetButton}
            >
              Réinitialiser
            </button>
            <button
              disabled={new Date(draftStart) > new Date(draftEnd)}
              onClick={applyDateRange}
              className={styles.applyButton}
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapControls;
