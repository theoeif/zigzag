import React, { createContext, useState, useEffect } from "react";
import { validateAccessToken, refreshAccessToken, setLogoutHandler } from "../api/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      // Validate the existing access token
      const isValidToken = await validateAccessToken();

      if (isValidToken) {
        setIsConnected(true); // Token is valid, user is connected
      } else {
        // Try to refresh the access token if the current one is invalid
        const newAccessToken = await refreshAccessToken();
        // Update connection state based on token validity
        setIsConnected(!!newAccessToken);
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      setIsConnected(false); // Ensure user is logged out in case of error
    } finally {
      setIsLoading(false); // Always stop the loading state
    }
  };

  // Initialize authentication on component mount
  useEffect(() => {
    initializeAuth();
    // Register central logout handler so API layer can force logout consistently
    setLogoutHandler(() => () => {
      setIsConnected(false);
    });

    return () => {
      setLogoutHandler(null);
    };
  }, []);

  const logout = () => {
    console.log("Logging out...");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setIsConnected(false);
  };

  return (
    <AuthContext.Provider value={{ isConnected, setIsConnected, logout }}>
      {/* Render children only after loading state is complete */}
      {!isLoading ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};
