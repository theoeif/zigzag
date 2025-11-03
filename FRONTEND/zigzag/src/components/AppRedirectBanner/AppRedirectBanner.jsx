import React from 'react';
import { IOS_APP_STORE_URL, ANDROID_PLAY_STORE_URL, FRONTEND_URL } from '../../config';
import { getDevicePlatform } from '../../utils/mobileDetection';
import './AppRedirectBanner.css';

const AppRedirectBanner = ({ eventId, onClose }) => {
  const handleOpenApp = () => {
    if (!eventId) {
      console.error('No event ID provided');
      return;
    }

    // Check for invite_token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite_token');
    
    // Use Universal Link (https://) instead of custom scheme
    // If app is installed, iOS will intercept and open it automatically
    const baseUrl = FRONTEND_URL || window.location.origin;
    let universalLink = `${baseUrl}/event/${eventId}`;
    if (inviteToken) {
      universalLink += `?invite_token=${inviteToken}`;
    }
    
    // Store attempt flag before navigation
    // This will be checked on page load to detect if app didn't open
    sessionStorage.setItem('app_open_attempt', JSON.stringify({
      timestamp: Date.now(),
      eventId,
      inviteToken
    }));
    
    // Navigate to universal link
    // If app opens, user leaves browser - success!
    // If app doesn't open, page reloads and we'll detect it in useEffect
    window.location.href = universalLink;
  };

  // Check on mount if we just attempted to open app but it failed
  React.useEffect(() => {
    const attemptData = sessionStorage.getItem('app_open_attempt');
    
    if (attemptData) {
      try {
        const { timestamp } = JSON.parse(attemptData);
        const timeSinceAttempt = Date.now() - timestamp;
        
        // Only trigger fallback if attempt was recent (within 5 seconds)
        // This means the page reloaded instead of app opening
        if (timeSinceAttempt < 10000) {
          // Clear the flag so we don't trigger again
          sessionStorage.removeItem('app_open_attempt');
          
          // Execute fallback: open app store
          const platform = getDevicePlatform();
          console.log('Opening app store for platform:', platform);
          if (platform === 'ios' && IOS_APP_STORE_URL) {
            window.open(IOS_APP_STORE_URL, '_blank');
          } else if (platform === 'android' && ANDROID_PLAY_STORE_URL) {
            window.open(ANDROID_PLAY_STORE_URL, '_blank');
          }
        } else {
          // Old attempt, clear it
          sessionStorage.removeItem('app_open_attempt');
        }
      } catch (error) {
        console.error('Error parsing app_open_attempt:', error);
        sessionStorage.removeItem('app_open_attempt');
      }
    }
  }, []); // Run once on mount

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
