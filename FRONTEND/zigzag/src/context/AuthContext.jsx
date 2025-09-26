import React, { createContext, useState, useContext, useEffect } from 'react';
import { validateAccessToken, setLogoutHandler } from '../api/api';

const AuthContext = createContext(null);

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const isValid = await validateAccessToken();
      setIsAuthenticated(isValid);
      setIsLoading(false);
    };
    checkAuth();

    // Exception with return :Register a central logout handler so API layer can force logout without reloading
    setLogoutHandler(() => () => {
      setIsAuthenticated(false);
    });

    return () => {
      // Cleanup the handler on unmount
      setLogoutHandler(null);
    };
  }, []);

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the context as a named export
export { AuthContext }; 