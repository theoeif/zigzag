import React, { memo } from 'react';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';
import styles from './TimelineToggle.module.css';

/**
 * A button component for toggling the visibility of the timeline bar.
 * Wrapped in React.memo to prevent unnecessary re-renders.
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether the timeline is currently visible
 * @param {Function} props.onToggle - Function to call when the button is clicked
 */
const TimelineToggle = memo(({ isVisible, onToggle }) => {
  // Handler that prevents event propagation
  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };

  return (
    <button
      className={styles.timelineToggleButton}
      onClick={handleToggle}
      title={isVisible ? "Hide Timeline" : "Show Timeline"}
      aria-label={isVisible ? "Hide Timeline" : "Show Timeline"}
    >
      {isVisible ? <FaChevronDown /> : <FaChevronUp />}
    </button>
  );
});

export default TimelineToggle;
