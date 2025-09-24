import axios from "axios";

// Auth helpers
export const login = async ({ username, password }) => {
  const response = await axios.post("http://127.0.0.1:8000/api/token/", { username, password });
  return response.data; // { access, refresh }
};

// Registration helper
export const register = async (payload) => {
  const response = await axios.post("http://127.0.0.1:8000/api/register/", payload);
  return response.data;
};

// Function to refresh the access token using the refresh token
export const refreshAccessToken = async () => {
  try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
          console.warn("No refresh token found.");
          return null;
      }

      const response = await axios.post("http://127.0.0.1:8000/api/token/refresh/", {
          refresh: refreshToken,
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
          console.error("Refresh token invalid or expired. Logging out.");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          // Redirect to home and refresh the page
          window.location.href = "/";
          window.location.reload();
      }
      return null;
  }
};

const retryingRequests = new Set(); // Track retried requests globally

axios.interceptors.response.use(
  (response) => response, // Pass through successful responses
  async (error) => {
    const { config, response } = error;

      // Prevent retries for token/verify
      if (config.url.includes("/token/verify/")) {
        console.warn("Validation request failed. Skipping retry.");
        return Promise.reject(error);
      }

    // Handle non-401 errors
    if (!response || response.status !== 401) return Promise.reject(error); 

    // Prevent multiple retries
    const requestId = `${config.method}:${config.url}`;
    if (retryingRequests.has(requestId)) return Promise.reject(error); 

    retryingRequests.add(requestId);

    const newAccessToken = await refreshAccessToken();
    // Retry original request
    if (newAccessToken) {
      config.headers["Authorization"] = `Bearer ${newAccessToken}`;
      retryingRequests.delete(requestId);
      return axios(config); 
    }
    retryingRequests.delete(requestId); // unnecessary maybe
    return Promise.reject(error); // Exit if token refresh fails
  }
);

// TODO : chnage this 
// export const validateAccessToken = async () => {
//   try {
//     const token = localStorage.getItem("access_token");
//     if (!token) return false; // Return false if no token is found

//     // Validate the token with the backend
//     await axios.post("http://127.0.0.1:8000/api/token/verify/", { token });
//     console.log("Access token is valid.");

//     // If the request is successful, return true
//     return true;
//   } catch (error) {
//     if (error.response && error.response.status === 401) {
//       console.warn("Access token is invalid or expired.");
//     } else {
//       console.error("Error validating access token:", error);
//     }
//     return false; // Return false on error or 401
//   }
// };

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

// Function to fetch public markers (available without authentication)
export const fetchPublicMarkers = async () => {
  try {
    const response = await axios.get("http://127.0.0.1:8000/api/accounts/markers/public/");
    console.log("Public markers response:", response.data);
    return response.data.public_markers || [];
  } catch (error) {
    console.error("Error fetching public markers:", error);
    return [];
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

    const response = await axios.post(`http://127.0.0.1:8000/api/accounts/markers/`,requestBody, {
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

    const response = await axios.get("http://127.0.0.1:8000/api/accounts/circles/", {
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
    const response = await axios.get("http://127.0.0.1:8000/api/accounts/tags/");
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
    const response = await axios.get("http://127.0.0.1:8000/api/accounts/user/addresses/", {
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
      "http://127.0.0.1:8000/api/accounts/user/addresses/",
      { 
      "address_line": address.address_line,
      "city": address.city,
      "state": address.state,
      "country": address.country,
      "postal_code": address.postal_code,
      "latitude": address.latitude,
      "longitude": address.longitude,
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
      `http://127.0.0.1:8000/api/accounts/user/addresses/${addressId}/`,
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


// fetch Friends profile
export const fetchProfile = async (id) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Attempt to refresh if no token
      if (!token) return null;
    }

    const response = await axios.get(`http://127.0.0.1:8000/api/accounts/profile/${id}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data; // Return the fetched profile data
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error.response?.data?.error || "Failed to load profile";
  }
};

// get Profiles for a user
export const fetchProfiles = async (query) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken(); // Refresh token if necessary
      if (!token) return [];
    }

    const response = await axios.get(`http://127.0.0.1:8000/api/accounts/friends/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data
  } catch (error) {
    console.error("Error fetching profiles:", error);
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

    const response = await axios.get(`http://127.0.0.1:8000/api/accounts/event/`, {
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

    const response = await axios.get(`http://127.0.0.1:8000/api/accounts/event/${id}/`, {
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
      "http://127.0.0.1:8000/api/accounts/event/",
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
      if (!token) return [];
    }

    const response = await axios.delete(`http://127.0.0.1:8000/api/accounts/event/${id}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.status === 204;
  } catch (error) {
    console.error("Error deleting event:", error);
    return [];
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
      `http://127.0.0.1:8000/api/accounts/event/${eventId}/`,
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
      `http://127.0.0.1:8000/api/accounts/circles/members/`, 
      { circle_ids: circleIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
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
    const response = await axios.post(`http://127.0.0.1:8000/api/accounts/circles/`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating circle:", error);
    return null;
  }
};

export const fetchFriendsAddresses = async () => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }
    
    const response = await axios.get("http://127.0.0.1:8000/api/friends/addresses/", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch addresses");

    return await response.json();
  } catch (error) {
    console.error("Error fetching friends' addresses:", error);
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
      "http://127.0.0.1:8000/api/accounts/profile/me/",
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

    const response = await axios.get("http://127.0.0.1:8000/api/accounts/profile/me/", {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

// Add friends to a circle
export const addFriendsToCircle = async (circleId, friends) => {
  try {
    let token = localStorage.getItem('access_token');
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    // Extract IDs from friend objects
    const friendIds = friends.map(friend => friend.id).filter(id => id);
    
    const response = await axios.post(
      `http://127.0.0.1:8000/api/accounts/circles/${circleId}/add_friends/`,
      { friend_ids: friendIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error adding friends to circle:', error);
    throw error;
  }
};

// Remove friends from a circle
export const removeFriendsFromCircle = async (circleId, friendIds) => {
  try {
    let token = localStorage.getItem('access_token');
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    // Ensure friendIds is an array
    const ids = Array.isArray(friendIds) ? friendIds : [friendIds];

    const response = await axios.post(
      `http://127.0.0.1:8000/api/accounts/circles/${circleId}/remove_friends/`,
      { friend_ids: ids },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error removing friends from circle:', error);
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
      `http://127.0.0.1:8000/api/accounts/circles/${circleId}/`,
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
      `http://127.0.0.1:8000/api/accounts/circles/${circleId}/`,
      updatedData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error updating circle:', error);
    throw error;
  }
};

export const fetchFriendsLocations = async () => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return null;
    }

    const response = await axios.get("http://127.0.0.1:8000/api/accounts/friends/locations/", {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Friend locations API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching friends locations:", error);
    return null;
  }
};

// Toggle participation status for an event
export const toggleEventParticipation = async (eventId) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) throw new Error("No access token available");
    }
    
    const response = await axios.post(
      `http://127.0.0.1:8000/api/accounts/event/${eventId}/toggle_participation/`,
      {},  // Empty body, all we need is the event ID
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error toggling event participation:', error);
    throw error;
  }
};

// Fetch participants of an event
export const fetchEventParticipants = async (eventId) => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) throw new Error("No access token available");
    }
    
    const response = await axios.get(
      `http://127.0.0.1:8000/api/accounts/event/${eventId}/participants/`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching event participants:', error);
    throw error;
  }
};

// Fetch events from friends of friends
export const fetchFriendsOfFriendsEvents = async () => {
  try {
    let token = localStorage.getItem("access_token");
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return [];
    }

    const response = await axios.get(`http://127.0.0.1:8000/api/accounts/friends_of_friends/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching friends of friends events:", error);
    return [];
  }
};

// New function to fetch public event data even without authentication
export const fetchPublicEvent = async (eventId, inviteToken = null) => {
  try {
    // Build the URL - first try the regular event endpoint which now supports public access
    let url = `http://127.0.0.1:8000/api/accounts/event/${eventId}/`;
    if (inviteToken) {
      // If we have an invite token, use the public-event endpoint which supports invitation tokens
      url = `http://127.0.0.1:8000/api/accounts/public-event/${eventId}/?invite=${inviteToken}`;
    }
    
    // Get auth headers if available, but don't require them
    const headers = {};
    const token = localStorage.getItem("access_token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      // If we get a 403 response from the regular endpoint
      if (error.response && error.response.status === 403) {
        // If we don't have an invite token, try the public endpoint
        if (!inviteToken) {
          try {
            const publicResponse = await axios.get(
              `http://127.0.0.1:8000/api/accounts/public-event/${eventId}/`, 
              { headers }
            );
            return publicResponse.data;
          } catch (publicError) {
            // If the public endpoint also returns a 403, return that limited data
            if (publicError.response && publicError.response.status === 403) {
              return publicError.response.data;
            }
            throw publicError;
          }
        }
        
        // Return the limited data from the original 403 response
        return error.response.data;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching public event:', error);
    // If we have response data with an error message, return it instead of throwing
    if (error.response && error.response.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Verify an invitation token
export const verifyInvitation = async (token) => {
  try {
    const response = await axios.get(`http://127.0.0.1:8000/api/accounts/verify-invitation/?token=${token}`);
    return response.data;
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return { valid: false };
  }
};

// Create event invitations
export const createEventInvitation = async (eventId, email) => {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) {
      const newToken = await refreshAccessToken();
      if (!newToken) throw new Error('Authentication required');
    }
    
    const response = await axios.post(
      `http://127.0.0.1:8000/api/accounts/invitations/`,
      { event: eventId, email },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating invitation:', error);
    throw error;
  }
};

// Accept an invitation
export const acceptInvitation = async (token) => {
  try {
    const authToken = localStorage.getItem("access_token");
    if (!authToken) {
      const newToken = await refreshAccessToken();
      if (!newToken) throw new Error('Authentication required');
    }
    
    const response = await axios.post(
      `http://127.0.0.1:8000/api/accounts/accept-invitation/`,
      { token },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

// Generate share token for an event
export const generateEventShareToken = async (eventId) => {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) {
      const newToken = await refreshAccessToken();
      if (!newToken) throw new Error('Authentication required');
    }
    
    const response = await axios.post(
      `http://127.0.0.1:8000/api/accounts/event-share-token/`,
      { event: eventId },
      { headers: { Authorization: `Bearer ${token || newToken}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error generating share token:', error);
    throw error;
  }
};
