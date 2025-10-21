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
  // Check for ZIGZAG-WebView identifier or generic WebView indicators
  return userAgent.includes('ZIGZAG-WebView') || userAgent.includes('wv');
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
