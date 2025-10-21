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
  if (/android/i.test(userAgent)) return 'android';
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return 'ios';
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
    !isInWebView() &&
    localStorage.getItem('zigzag_app_banner_permanent_dismiss') !== 'true'
  );
};
