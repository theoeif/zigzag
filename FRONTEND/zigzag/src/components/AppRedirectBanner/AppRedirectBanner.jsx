import React from 'react';
import { IOS_APP_STORE_URL, ANDROID_PLAY_STORE_URL, DEEP_LINK_SCHEME } from '../../config';
import { getDevicePlatform } from '../../utils/mobileDetection';
import './AppRedirectBanner.css';

const AppRedirectBanner = ({ eventId, onClose }) => {
  const handleOpenApp = () => {
    if (!eventId) {
      console.error('No event ID provided');
      return;
    }

    // Try to open app with custom scheme
    const deepLink = `${DEEP_LINK_SCHEME}event/${eventId}`;
    window.location.href = deepLink;
    
    // Fallback to app store if app doesn't open
    setTimeout(() => {
      const platform = getDevicePlatform();
      if (platform === 'ios') {
        window.open(IOS_APP_STORE_URL, '_blank');
      } else if (platform === 'android') {
        window.open(ANDROID_PLAY_STORE_URL, '_blank');
      }
    }, 2000);
  };

  const handleDismissPermanently = () => {
    localStorage.setItem('zigzag_app_banner_permanent_dismiss', 'true');
    onClose();
  };

  return (
    <div className="app-redirect-banner">
      <div className="banner-content">
        <div className="banner-icon">Z</div>
        <div className="banner-text">
          <span className="banner-title">Open in ZIGZAG App</span>
          <span className="banner-subtitle">Better experience</span>
        </div>
      </div>
      <div className="banner-actions">
        <button 
          className="banner-btn-open"
          onClick={handleOpenApp}
        >
          Open
        </button>
        <button 
          className="banner-btn-close"
          onClick={onClose}
          aria-label="Close banner"
        >
          ×
        </button>
      </div>
      <button 
        className="banner-btn-never"
        onClick={handleDismissPermanently}
      >
        Don't show again
      </button>
    </div>
  );
};

export default AppRedirectBanner;
