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
 * Initialize deep link handling for Capacitor app
 * SECURITY: Only processes valid UUID event IDs
 * @param {Function} navigate - React Router navigate function
 */
export const initDeepLinking = (navigate) => {
  // Only initialize if in Capacitor environment
  if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
    console.log('Deep linking: Not in Capacitor app, skipping initialization');
    return;
  }

  console.log('Deep linking: Initializing in Capacitor app');

  App.addListener('appUrlOpen', (event) => {
    console.log('Deep link received:', event.url);
    
    try {
      const url = event.url;
      
      // Parse: zigzag://event/d36cf853-c4a5-4812-9b28-7738238653f5
      const match = url.match(/^zigzag:\/\/event\/([a-f0-9-]+)$/i);
      
      if (match && match[1]) {
        const eventId = match[1];
        
        // SECURITY: Validate event ID format
        if (!isValidEventId(eventId)) {
          console.error('Deep linking: Invalid event ID format', eventId);
          return;
        }
        
        console.log('Deep linking: Valid event ID, navigating to:', eventId);
        
        // Navigate to event in app with small delay to ensure app is ready
        setTimeout(() => {
          navigate(`/event/${eventId}`);
        }, 100);
      } else {
        console.warn('Deep linking: URL pattern not recognized', url);
      }
    } catch (error) {
      console.error('Deep linking: Error processing URL', error);
    }
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
