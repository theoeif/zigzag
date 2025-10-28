import axios from "axios";
import { API_BASE_URL } from "../config";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

// Single in-flight refresh promise to throttle concurrent refreshes
let refreshPromise = null;

// Centralized logout handler to keep React state consistent
let logoutHandler = null;
export const setLogoutHandler = (handler) => {
  logoutHandler = typeof handler === 'function' ? handler : null;
};

// Auth helpers
export const login = async ({ username, password }) => {
  try {
    // Support login with username or email
    const identifier = username; // Can be username or email
    const response = await axios.post(API_BASE_URL + "token/", { username: identifier, password });
    console.log("Login response.data:", response.data);
    const { access, refresh } = response.data || {};
    if (access) localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
    return response.data; // { access, refresh }
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    throw error;
  }
};

// Password reset request
export const requestPasswordReset = async (email) => {
  try {
    const response = await axios.post(API_BASE_URL + "events/password-reset/request/", { email });
    return response.data;
  } catch (error) {
    console.error("Password reset request error:", error.response?.data || error.message);
    throw error;
  }
};

// Password reset confirmation
export const confirmPasswordReset = async (uid, token, newPassword, confirmPassword) => {
  try {
    const response = await axios.post(API_BASE_URL + "events/password-reset/confirm/", {
      uid,
      token,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return response.data;
  } catch (error) {
    console.error("Password reset confirm error:", error.response?.data || error.message);
    throw error;
  }
};

// Registration helper
export const register = async (payload) => {
  try {
    const response = await axios.post(API_BASE_URL + "register/", payload);
    console.log("Register response.data:", response.data);
    const { access, refresh, username } = response.data || {};
    if (access) localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
    if (username) localStorage.setItem("username", username);
    return response.data;
  } catch (error) {
    console.error("Register error:", error.response?.data || error.message);
    throw error;
  }
};

// Function to refresh the access token using the refresh token
export const refreshAccessToken = async () => {
  try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
          console.warn("No refresh token found.");
          return null;
      }

      // Use a direct axios call without interceptors to avoid circular dependency
      const response = await axios.post(API_BASE_URL + "token/refresh/", {
          refresh: refreshToken,
      }, {
        // Skip the response interceptor for this specific request
        skipAuthRefresh: true
      });

      const newAccessToken = response.data.access;
      localStorage.setItem("access_token", newAccessToken);

      // If a new refresh token is provided, update it in localStorage
      if (response.data.refresh) {
        localStorage.setItem("refresh_token", response.data.refresh);
      }

      return newAccessToken;
  } catch (error) {
      if (error.response?.status === 401) {
          console.error("Refresh token invalid or expired. Forcing logout.");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          if (logoutHandler) {
            try { logoutHandler(); } catch (_) {}
          }
      }
      return null;
  }
};

// Blacklist the current refresh token server-side (JWT revoke)
export const blacklistRefreshToken = async () => {
  try {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return false;
    await axios.post(API_BASE_URL + "token/blacklist/", { refresh });
    return true;
  } catch (error) {
    console.warn("Failed to blacklist refresh token:", error?.response?.data || error?.message);
    return false;
  }
};

const retryingRequests = new Set(); // Track retried requests globally

axios.interceptors.response.use(
  (response) => response, // Pass through successful responses
  async (error) => {
    const { config, response } = error;
    const url = config?.url || "";

    // Skip refresh logic for requests that explicitly opt out
    if (config?.skipAuthRefresh) {
      return Promise.reject(error);
    }

    // Prevent retries for token/verify and token/refresh endpoints
    if (url.includes("/token/") || url.includes("/token/refresh/")) {
      console.warn("Validation request failed. Skipping retry.");
      return Promise.reject(error);
    }

    // Handle non-401 errors
    if (!response || response.status !== 401) return Promise.reject(error);

    // Throttle refresh to a single in-flight promise
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newAccessToken = await refreshPromise;
    // Retry original request
    if (newAccessToken) {
      config.headers["Authorization"] = `Bearer ${newAccessToken}`;
      return axios(config);
    }
    return Promise.reject(error); // Exit if token refresh fails
  }
);

// TODO : understand why its here
export const validateAccessToken = async () => {
  const token = localStorage.getItem("access_token");
  if (!token) return false;

  try {
    // Decode JWT payload
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return false;

    const payloadJson = JSON.parse(atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")));
    const now = Math.floor(Date.now() / 1000);

    // If not expired, it's valid
    if (payloadJson && typeof payloadJson.exp === "number" && payloadJson.exp > now) {
      return true;
    }

    // Expired: try refresh
    const newAccess = await refreshAccessToken();
    return !!newAccess;
  } catch {
    // If decode fails, try refresh anyway
    const newAccess = await refreshAccessToken();
    return !!newAccess;
  }
};

// Function to fetch markers data
export const fetchMarkers = async (selectedTags) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Attempt to refresh if no token
      if (!token) return null;
    }

    // Add selected tags as query parameters
    const requestBody = {
      tags: selectedTags
    };

    const response = await axios.post(`${API_BASE_URL}events/markers/`,requestBody, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Markers data received:", response.data); // Debug log

    // Return simplified format with just red_markers (projected events)
    return {
      red_markers: response.data.private_markers || []
    };
  } catch (error) {
    console.error("Error fetching markers:", error);
    return null;
  }
};


// Function to fetch circles data
export const fetchCircles = async () => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Attempt to refresh if no token
      if (!token) return null;
    }

    const response = await axios.get(API_BASE_URL + "events/circles/", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // console.log("Circles data received:", response.data); // Debug log

    return response.data; // Return circle data
  } catch (error) {
    console.error("Error fetching circles:", error);
    return null;
  }
};

// Function to fetch tags data (public endpoint)
export const fetchMyTags = async () => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Attempt to refresh if no token
      if (!token) return null;
    }

    const response = await axios.get(API_BASE_URL + "events/tags/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Tags data received:", response.data); // Debug log
    return response.data; // Return tags data
  } catch (error) {
    console.error("Error fetching tags:", error);
    return null;
  }
};


// Function to persist selected circles in localStorage
export const persistSelectedTags = (selectedTags) => {
  localStorage.setItem("selectedTags", JSON.stringify(selectedTags));
};


// Fetch user addresses
export const fetchAddresses = async () => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Refresh token if missing
      if (!token) return null;
    }
    const response = await axios.get(API_BASE_URL + "events/user/addresses/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // Expected format: [{ address: "123 Street" }, ...]
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return null;
  }
};

// Add a new address
export const addAddress = async (address) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Refresh token if missing
      if (!token) return false;
    }
    const response = await axios.post(
      API_BASE_URL + "events/user/addresses/",
      {
      "address_line": address.address_line,
      "city": address.city,
      "state": address.state,
      "country": address.country,
      "postal_code": address.postal_code,
      "latitude": address.latitude,
      "longitude": address.longitude,
      "label": address.label || "", // Include label if provided
      }, // Send fields directly with address no ?
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json",} }
    );
    return response.data; // Return true if address added successfully
  } catch (error) {
    console.error("Error adding address:", error.response?.data || error.message);
    // console.error("Error adding address:", error);
    return false;
  }
};

export const deleteAddress = async (addressId) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Refresh token if missing
      if (!token) return false;
    }

    const response = await axios.delete(
      `${API_BASE_URL}events/user/addresses/${addressId}/`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.status === 204; // Return true if address is deleted successfully
  } catch (error) {
    console.error("Error deleting address:", error);
    return false;
  }
};

// Update address label
export const updateAddressLabel = async (addressId, newLabel) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Refresh token if missing
      if (!token) return false;
    }

    const response = await axios.patch(
      `${API_BASE_URL}events/user/addresses/${addressId}/`,
      { label: newLabel },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data; // Return the updated address data
  } catch (error) {
    console.error("Error updating address label:", error);
    return false;
  }
};

// TODO : Reomve releated Code
// fetch Friends profile
export const fetchProfile = async (username) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Attempt to refresh if no token
      if (!token) return null;
    }

    // Use the user-profile-by-username endpoint to get username + nested profile
    const response = await axios.get(`${API_BASE_URL}events/users/${username}/profile/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data; // { id, username, profile: { ... } }
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error.response?.data?.error || "Failed to load profile";
  }
};

// get Users for adding to circles
export const fetchUsers = async (query) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Refresh token if necessary
      if (!token) return [];
    }

    const response = await axios.get(`${API_BASE_URL}events/users/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

// get Events for a user
export const fetchEvents = async (query) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Refresh token if necessary
      if (!token) return [];
    }

    const response = await axios.get(`${API_BASE_URL}events/event/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};

// get Event details
export const fetchEventInfo = async (id) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Refresh token if necessary
      if (!token) return [];
    }

    const response = await axios.get(`${API_BASE_URL}events/event/${id}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data
  } catch (error) {
    console.error("Error fetching event info:", error);
    return [];
  }
};

// Create a new event
export const createEvent = async (eventData) => {
  try {
    // No need to reconstruct the payload, use the eventData directly
    // since it's already structured correctly in the form's handleSubmit
    console.log("Creating event with payload:", JSON.stringify(eventData));

    // Retrieve the access token and refresh if necessary
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) {
        throw new Error("Unable to obtain access token.");
      }
    }

    // Post the new event
    const response = await axios.post(
      API_BASE_URL + "events/event/",
      eventData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};



export const deleteEvent = async (id) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Refresh token if necessary
      if (!token) return false;
    }

    const response = await axios.delete(`${API_BASE_URL}events/event/${id}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.status === 204;
  } catch (error) {
    console.error("Error deleting event:", error);
    return false;
  }
};



export const patchEvent = async (eventId, patchData) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) {
        throw new Error("Unable to obtain access token.");
      }
    }

    const response = await axios.patch(
      `${API_BASE_URL}events/event/${eventId}/`,
      patchData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error patching event:", error);
    throw error;
  }
};



// Fetch members from circles - simplified to always use the multi-circle endpoint
export const fetchCircleMembers = async (circleIdOrIds) => {
  try {
    // Always convert input to array format for consistency
    const circleIds = Array.isArray(circleIdOrIds) ? circleIdOrIds : [circleIdOrIds];

    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) throw new Error("No access token available");
    }

    // Use the circles/members endpoint for all requests
    const response = await axios.post(
      `${API_BASE_URL}events/circles/members/`,
      { circle_ids: circleIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (error) {
    // Handle 404 error specifically
    if (error.response && error.response.status === 404) {
      // Pass through the backend error message (handles plural/singular)
      const errorMessage = error.response.data?.error || "Tu ne fais pas partie de ce cercle";
      const customError = new Error(errorMessage);
      customError.status = 404;
      customError.isAccessError = true;
      throw customError;
    }
    console.error('Error fetching circle members:', error);
    throw error;
  }
};


// Fetch members (friends) of a circle
export const fetchAddCircle = async (payload) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    // You can adjust the endpoint URL as needed.
    const response = await axios.post(`${API_BASE_URL}events/circles/`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating circle:", error);
    return null;
  }
};

// Update user profile data
export const updateProfile = async (profileData) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    const response = await axios.patch(
      API_BASE_URL + "events/profile/me/",
      profileData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

// Fetch user profile data
export const fetchUserProfile = async () => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    const response = await axios.get(API_BASE_URL + "events/profile/me/", {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

// Add users to a circle
export const addUsersToCircle = async (circleId, users) => {
  try {
    let token = localStorage.getItem('access_token');
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    // Extract IDs from user objects
    const memberIds = users.map(user => user.id).filter(id => id);

    const response = await axios.post(
      `${API_BASE_URL}events/circles/${circleId}/add_members/`,
      { member_ids: memberIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (error) {
    console.error('Error adding users to circle:', error);
    throw error;
  }
};

// Remove users from a circle
export const removeUsersFromCircle = async (circleId, memberIds) => {
  try {
    let token = localStorage.getItem('access_token');
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    // Ensure memberIds is an array
    const ids = Array.isArray(memberIds) ? memberIds : [memberIds];

    const response = await axios.post(
      `${API_BASE_URL}events/circles/${circleId}/remove_members/`,
      { member_ids: ids },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (error) {
    console.error('Error removing users from circle:', error);
    throw error;
  }
};

// Delete a circle
export const deleteCircle = async (circleId) => {
  try {
    let token = localStorage.getItem('access_token');
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    const response = await axios.delete(
      `${API_BASE_URL}events/circles/${circleId}/`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.status === 204;
  } catch (error) {
    console.error('Error deleting circle:', error);
    throw error;
  }
};

// Update a circle
export const updateCircle = async (circleId, updatedData) => {
  try {
    let token = localStorage.getItem('access_token');
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    const response = await axios.patch(
      `${API_BASE_URL}events/circles/${circleId}/`,
      updatedData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (error) {
    console.error('Error updating circle:', error);
    throw error;
  }
};

export const fetchMyLocations = async () => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    const response = await axios.get(API_BASE_URL + "events/my/locations/", {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("My locations API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching my locations:", error);
    return null;
  }
};

// New function to fetch public event data even without authentication
export const fetchDirectEvent = async (eventId) => {
  try {
    console.log(`🔍 FRONTEND: Starting fetchDirectEvent for event ${eventId}`);
    
    // Get auth headers if available, but don't require them
    const headers = {};
    const token = localStorage.getItem("access_token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log(`🔍 FRONTEND: Using auth token for fetchDirectEvent`);
    } else {
      console.log(`🔍 FRONTEND: No auth token for fetchDirectEvent`);
    }

    console.log(`🔍 FRONTEND: Making API call to fetch event`);
    const response = await axios.get(`${API_BASE_URL}events/event/${eventId}/`, { headers });
    
    console.log(`🔍 FRONTEND: Event fetched successfully:`, response.data);
    return response.data;
  } catch (error) {
    console.error('🔍 FRONTEND: Error fetching direct event:', error);
    // If we have response data with an error message, return it instead of throwing
    if (error.response && error.response.data) {
      console.log(`🔍 FRONTEND: Error response data:`, error.response.data);
      return error.response.data;
    }
    throw error;
  }
};


// Fetch grey events for selected circles (privacy-protected)
export const fetchGreyEvents = async (circleIds) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) throw new Error('Authentication required');
    }

    // Convert circleIds to query parameters
    const queryParams = circleIds.map(id => `circle_ids=${id}`).join('&');
    const response = await axios.get(
      `${API_BASE_URL}events/circles/grey-events/?${queryParams}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching grey events:', error);
    throw error;
  }
};

// iCal export function
export const downloadICalFile = async (circleIds = []) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) throw new Error('Authentication required');
    }

    // Build query params for circle filtering
    const params = new URLSearchParams();
    circleIds.forEach(id => params.append('circles', id));

    const url = `${API_BASE_URL}events/ical/download/${params.toString() ? '?' + params.toString() : ''}`;

    // Use fetch to get the file with proper authentication
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the blob data
    const blob = await response.blob();

    if (Capacitor.isNativePlatform()) {
      // MOBILE: Use Capacitor Share API
      const arrayBuffer = await blob.arrayBuffer();
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const fileName = `zigzag-events-${new Date().toISOString().split('T')[0]}.ics`;
      
      // First save to a temporary location
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      // Get the file URI
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName,
      });

      // Share the file - this opens the native share sheet
      await Share.share({
        title: 'Exporter le calendrier',
        text: 'Calendrier ZIGZAG',
        url: fileUri.uri,
        dialogTitle: 'Choisir une application',
      });

      // Clean up the temporary file
      await Filesystem.deleteFile({
        directory: Directory.Cache,
        path: fileName,
      });
    } else {
      // WEB: Use traditional web download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'zigzag-events.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }

    return true;
  } catch (error) {
    console.error('Error downloading iCal file:', error);
    throw error;
  }
};

// Single event iCal download function
export const downloadSingleEventICal = async (event) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) throw new Error('Authentication required');
    }

    // Create a simple iCal content for a single event
    const formatDate = (date) => {
      return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const eventTitle = event.title || 'Untitled Event';
    const eventDescription = event.description || '';
    const eventLocation = (() => {
      if (!event.address) return '';
      
      const parts = [];
      if (event.address.address_line) parts.push(event.address.address_line);
      if (event.address.city) parts.push(event.address.city);
      
      return parts.join(', ');
    })();

    // Generate unique IDs for the events
    const eventId1 = `zigzag-${event.id}-start@zigzag.com`;
    const eventId2 = `zigzag-${event.id}-end@zigzag.com`;
    const now = formatDate(new Date());
    
    // Create a safe filename from the event title
    const createSafeFilename = (title, eventId) => {
      // Remove or replace characters that are not safe for filenames
      const safeTitle = title
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .substring(0, 50) // Limit length to 50 characters
        .trim();
      
      // Fallback to event ID if title is empty or only special characters
      const filename = safeTitle || `event-${eventId}`;
      
      return `zigzag-${filename}.ics`;
    };
    
    // Create two events: one for start_time and one for end_time
    const createEvent = (startTime, endTime, uid, summary) => {
      const startDate = formatDate(startTime);
      const endDate = formatDate(endTime);
      
      return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${summary}
DESCRIPTION:${eventDescription.replace(/\n/g, '\\n')}
LOCATION:${eventLocation}
STATUS:CONFIRMED
END:VEVENT`;
    };
    
    // Create iCal content with two events
    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ZIGZAG//Events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${createEvent(
  event.start_time,
  new Date(new Date(event.start_time).getTime() + 2 * 60 * 60 * 1000),
  eventId1,
  `${eventTitle} (Début)`
)}
${event.end_time ? createEvent(
  event.end_time,
  new Date(new Date(event.end_time).getTime() + 2 * 60 * 60 * 1000),
  eventId2,
  `${eventTitle} (Fin)`
) : ''}
END:VCALENDAR`;

    if (Capacitor.isNativePlatform()) {
      // MOBILE: Use Capacitor Share API
      const fileName = createSafeFilename(event.title, event.id);
      
      // First save to a temporary location
      await Filesystem.writeFile({
        path: fileName,
        data: icalContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      // Get the file URI
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName,
      });

      // Share the file - this opens the native share sheet
      await Share.share({
        title: 'Ajouter au calendrier',
        text: `Événement: ${event.title}`,
        url: fileUri.uri,
        dialogTitle: 'Choisir une application',
      });

      // Clean up the temporary file
      await Filesystem.deleteFile({
        directory: Directory.Cache,
        path: fileName,
      });
    } else {
      // WEB: Use traditional web download
      const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = createSafeFilename(event.title, event.id);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      alert("À ouvrir dans votre calendrier !");
    }

    return true;
  } catch (error) {
    console.error('Error downloading single event iCal file:', error);
    throw error;
  }
};

// Password change function
export const changePassword = async (passwordData) => {
  try {
    const response = await axios.post(API_BASE_URL + "events/change-password/", passwordData);
    return response.data;
  } catch (error) {
    console.error("Password change error:", error.response?.data || error.message);
    throw error;
  }
};

// Generate invitation link for an event
export const generateEventInvite = async (eventId) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) throw new Error('Authentication required');
    }

    const response = await axios.post(
      `${API_BASE_URL}events/event/${eventId}/generate_invite/`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (error) {
    console.error('Error generating event invite:', error);
    throw error;
  }
};

// Accept invitation to join event's invitation circle
export const acceptEventInvite = async (eventId, invitationToken) => {
  try {
    console.log(`🎯 FRONTEND: Starting acceptEventInvite for event ${eventId} with token ${invitationToken}`);
    
    let token = localStorage.getItem("access_token");
    if (!token) {
      console.log('🎯 FRONTEND: No access token, refreshing...');
      token = await refreshAccessToken();
      if (!token) throw new Error('Authentication required');
    }

    console.log(`🎯 FRONTEND: Making API call to accept invitation`);
    const response = await axios.post(
      `${API_BASE_URL}events/event/${eventId}/accept_invite/`,
      { invitation_token: invitationToken },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`🎯 FRONTEND: Accept invitation response:`, response.data);
    return response.data;
  } catch (error) {
    console.error('🎯 FRONTEND: Error accepting event invite:', error);
    throw error;
  }
};
