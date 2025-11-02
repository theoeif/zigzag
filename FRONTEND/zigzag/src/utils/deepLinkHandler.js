import { App } from '@capacitor/app';

// UUID validation regex for security
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate event ID to prevent malicious input
 * @param {string} eventId - The event ID to validate
 * @returns {boolean} - True if valid UUID format
 */
const isValidEventId = (eventId) => {
  return UUID_REGEX.test(eventId);
};

/**
 * Parse event ID and invite token from Universal Links
 * Supports: https://domain.com/event/{id}?invite_token=...
 */
const parseDeepLink = (url) => {
  try {
    let queryString = '';
    let match = null;
    
    // Handle universal links: https://www.zigzag-project.org/event/{id}?invite_token=...
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/^\/event\/([a-f0-9-]+)$/i);
      if (pathMatch) {
        match = [url, pathMatch[1], urlObj.search];
        queryString = urlObj.search;
      }
    } catch (urlError) {
      // If URL parsing fails, try regex fallback for https
      const httpsMatch = url.match(/^https?:\/\/[^\/]+\/event\/([a-f0-9-]+)(\?.*)?$/i);
      if (httpsMatch) {
        match = httpsMatch;
        queryString = httpsMatch[2] || '';
      }
    }
    
    if (!match || !match[1]) {
      return null;
    }
    
    const eventId = match[1];
    
    // Validate event ID format
    if (!isValidEventId(eventId)) {
      console.error('Deep linking: Invalid event ID format', eventId);
      return null;
    }
    
    // Extract invite_token from query string if present
    let inviteToken = null;
    if (queryString) {
      const cleanQuery = queryString.startsWith('?') ? queryString.substring(1) : queryString;
      const urlParams = new URLSearchParams(cleanQuery);
      inviteToken = urlParams.get('invite_token');
    }
    
    return { eventId, inviteToken };
  } catch (error) {
    console.error('Deep linking: Error parsing URL', error);
    return null;
  }
};

/**
 * Handle deep link navigation
 */
const handleDeepLink = (url, navigate) => {
  console.log('Deep link received:', url);
  
  const parsed = parseDeepLink(url);
  
  if (!parsed) {
    console.warn('Deep linking: URL pattern not recognized', url);
    return;
  }
  
  const { eventId, inviteToken } = parsed;
  
  // Store invite token in sessionStorage for callback processing
  if (inviteToken) {
    sessionStorage.setItem('pending_invite_token', inviteToken);
    sessionStorage.setItem('pending_event_id', eventId);
    console.log('Deep linking: Stored invite token for processing:', inviteToken);
  }
  
  console.log('Deep linking: Valid event ID, navigating to:', eventId);
  
  // Navigate to event in app with small delay to ensure app is ready
  // DirectEventLinkView will handle authentication check and redirect if needed
  setTimeout(() => {
    const path = `/event/${eventId}${inviteToken ? `?invite_token=${inviteToken}` : ''}`;
    console.log('Deep linking: Navigating to:', path);
    navigate(path);
  }, 100);
};

/**
 * Initialize deep link handling for Capacitor app
 * SECURITY: Only processes valid UUID event IDs
 * Supports Universal Links (https://)
 * @param {Function} navigate - React Router navigate function
 */
export const initDeepLinking = (navigate) => {
  // Only initialize if in Capacitor environment
  if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
    console.log('Deep linking: Not in Capacitor app, skipping initialization');
    return;
  }

  console.log('Deep linking: Initializing in Capacitor app');

  // Handle deep links when app is already running
  App.addListener('appUrlOpen', (event) => {
    handleDeepLink(event.url, navigate);
  });
  
  // Handle app launch from universal link when app was closed
  App.getLaunchUrl().then((result) => {
    if (result && result.url) {
      console.log('Deep linking: App launched with URL:', result.url);
      handleDeepLink(result.url, navigate);
    }
  }).catch(() => {
    // No launch URL, app was opened normally
    console.log('Deep linking: App opened normally, no launch URL');
  });
};

/**
 * Remove deep link listener (cleanup)
 */
export const removeDeepLinkListener = async () => {
  if (window.Capacitor && window.Capacitor.isNativePlatform) {
    await App.removeAllListeners();
  }
};
