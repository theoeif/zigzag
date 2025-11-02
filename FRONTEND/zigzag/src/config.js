// Centralized configuration for the frontend
// Do not commit real secrets to source control for production apps.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const OPEN_CAGE_API_KEY = import.meta.env.VITE_OPEN_CAGE_API_KEY;
export const OPENCAGE_SEARCH_TOKEN = import.meta.env.VITE_OPENCAGE_SEARCH_TOKEN;
export const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
export const MAPBOX_SEARCH_TOKEN = import.meta.env.VITE_MAPBOX_SEARCH_TOKEN;



// Deep Link Configuration
export const IOS_APP_STORE_URL = import.meta.env.VITE_IOS_APP_STORE_URL || 'https://apps.apple.com/app/zigzag/id[YOUR_APP_ID]';
export const ANDROID_PLAY_STORE_URL = import.meta.env.VITE_ANDROID_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.zigzagunique.app';
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';
