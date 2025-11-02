export const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
};

export const isInCapacitorApp = () => {
  // Check if running inside Capacitor app (most reliable method)
  return window.Capacitor !== undefined && window.Capacitor.isNativePlatform();
};

export const isInWebView = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  // Only check for our specific ZIGZAG-WebView identifier
  // Remove the generic 'wv' check as it's too broad and matches regular mobile browsers
  return userAgent.includes('ZIGZAG-WebView');
};

export const getDevicePlatform = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Android detection (most reliable)
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  // iOS detection - multiple methods for robustness
  const isIOS = (
    // Check user agent patterns
    /iPad|iPhone|iPod/.test(userAgent) ||
    // Modern iPad detection (iOS 13+ reports as MacIntel in some contexts)
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||

    (/MacIntel/.test(userAgent) && navigator.maxTouchPoints > 1) ||
    // Check for Safari on iOS
    (/Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS|OPiOS/.test(userAgent) && /Mobile/.test(userAgent)) ||
    
    /CriOS|FxiOS|OPiOS/.test(userAgent) ||
    // Check platform string
    /iPhone|iPad|iPod/.test(navigator.platform || '')
  )
  
  if (isIOS) {
    return 'ios';
  }
  
  // If we can't detect, log for debugging and default to Android for safety
  // (Android devices are more numerous and detection is less robust)
  if (isMobileDevice()) {
    console.warn('Could not determine platform, defaulting to Android. UserAgent:', userAgent);
    return 'android'; // Default to Android for mobile devices we can't identify
  }
  console.warn('Could not determine platform', userAgent);
  return 'unknown';
};

export const shouldShowAppBanner = () => {
  // Show banner only if:
  // 1. On mobile device
  // 2. NOT in Capacitor app
  // 3. NOT in WebView
  // 4. NOT permanently dismissed
  return (
    isMobileDevice() &&
    !isInCapacitorApp() &&
    !isInWebView() && // important for Ios App user agent
    localStorage.getItem('zigzag_app_banner_permanent_dismiss') !== 'true'
  );
};
