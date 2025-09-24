// LeftMenu.jsx
import React, { useContext, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthProvider";
import "../../index.css";
import { fetchEvents, fetchProfiles, fetchEventInfo } from "../../api/api";

// Define animation duration in one place for easy adjustment
const ANIMATION_DURATION = 500; // in milliseconds

const LeftMenu = ({ closeMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, setIsConnected } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [clickingButton, setClickingButton] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  
  // Refs for buttons to attach animation listeners
  const buttonRefs = useRef({
    profile: null,
    events: null,
    circles: null,
    "create-account": null,
    login: null,
    disconnect: null
  });
  
  // Get active button from localStorage - moved outside of useState to ensure it's always current
  const savedActiveButton = localStorage.getItem('activeMenuButton') || "";
  const [activeButton, setActiveButton] = useState(savedActiveButton);

  // Force refresh active button on component mount
  useEffect(() => {
    // Check if we're inside the Project component's isolated container
    // Regular behavior for all page contexts
      // Regular behavior for other page contexts
      // This will work for both web and mobile as it uses localStorage
    const savedButton = localStorage.getItem('activeMenuButton');
    if (savedButton) {
      setActiveButton(savedButton);
      // Force a repaint to ensure styles are applied (helps with web rendering)
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger a reflow
      document.body.style.display = '';
    }
  }, []);

  // Setup animation end listeners
  useEffect(() => {
    // Handle animation end for all buttons
    const handleAnimationEnd = () => {
      if (pendingNavigation) {
        const { path, buttonKey } = pendingNavigation;
        
        setClickingButton(null);
        setPendingNavigation(null);
        
        if (location.pathname === path) {
          closeMenu();
        } else {
          navigate(path);
        }
      } else if (clickingButton === "disconnect") {
        // Handle disconnect animation end
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setIsConnected(false);
        setClickingButton(null);
        navigate("/");
      }
    };

    // Attach animation end listeners to all button refs
    Object.values(buttonRefs.current).forEach(buttonRef => {
      if (buttonRef) {
        buttonRef.addEventListener('animationend', handleAnimationEnd);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      Object.values(buttonRefs.current).forEach(buttonRef => {
        if (buttonRef) {
          buttonRef.removeEventListener('animationend', handleAnimationEnd);
        }
      });
    };
  }, [pendingNavigation, clickingButton, navigate, closeMenu, location.pathname, setIsConnected]);

  // Sync active button with URL path when it changes
  useEffect(() => {
    const path = location.pathname;
    let currentActive = "";
    
    // Check for exact paths
    if (path === "/profile" || path.startsWith("/profile/")) {
      currentActive = "profile";
    } else if (path === "/events") {
      currentActive = "events";
    } else if (path === "/circles") {
      currentActive = "circles";
    } else if (path === "/create-account") {
      currentActive = "create-account";
    } else if (path === "/login") {
      currentActive = "login";
    }
    
    if (currentActive) {
      setActiveButton(currentActive);
      // Ensure we update localStorage for both web and mobile
      localStorage.setItem('activeMenuButton', currentActive);
    }
  }, [location.pathname]);

  const handleNavigation = (path, buttonKey) => {
    // Don't navigate if we're already clicking a button
    if (clickingButton) return;
    
    // Immediately update activeButton for visual feedback
    setActiveButton(buttonKey);
    
    // Set the clicking button to show animation
    setClickingButton(buttonKey);
    
    // Make sure to set localStorage first before animation
    localStorage.setItem('activeMenuButton', buttonKey);
    
    // Store the pending navigation to be executed when animation ends
    setPendingNavigation({ path, buttonKey });
    
    // Fallback timeout in case animation events don't fire
    setTimeout(() => {
      if (clickingButton === buttonKey && pendingNavigation) {
        setClickingButton(null);
        setPendingNavigation(null);
        
        if (location.pathname === path) {
          closeMenu(); 
        } else {
          navigate(path);
        }
      }
    }, ANIMATION_DURATION + 50); // Add a small buffer
  };

  const handleDisconnect = () => {
    // Don't disconnect if we're already clicking a button
    if (clickingButton) return;
    
    // Set clicking animation for disconnect button
    setClickingButton("disconnect");
    
    // Fallback timeout in case animation events don't fire
    setTimeout(() => {
      if (clickingButton === "disconnect") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setIsConnected(false);
        setClickingButton(null);
        navigate("/");
      }
    }, ANIMATION_DURATION + 50); // Add a small buffer
  };

  // Get button class for animation states
  const getButtonClass = (buttonKey) => {
    return `menu-btn ${activeButton === buttonKey ? "menu-btn-active" : ""} ${clickingButton === buttonKey ? "menu-btn-clicking" : ""}`;
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchTerm(query);

    if (query.length > 1) {
      // Fetch profiles and events in parallel
      const [rawProfiles, rawEvents] = await Promise.all([
        fetchProfiles(),
        fetchEvents(),
      ]);
    
      const profiles = rawProfiles.map((profile) => ({
        id: profile.id,
        name: profile.username, // Map 'username' to 'name'
        type: "profile",
      }));
    
      const events = rawEvents.map((event) => ({
        id: event.id,
        name: event.title, // Map 'title' to 'name'
        type: "project",
      }));

      // Combine and set results
      setSearchResults([...profiles, ...events]);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectResult = async (result) => {
    if (clickingButton) return;
    
    if (result.type === "profile") {
      // Set active button to "profile" when navigating to a profile
      setActiveButton("profile");
      localStorage.setItem('activeMenuButton', "profile");
      navigate(`/profile/${result.id}`);
    } else if (result.type === "project") {
      try {
        const eventInfo = await fetchEventInfo(result.id);
        
        navigate({
          pathname: '/',
          search: `?lat=${eventInfo.lat}&lng=${eventInfo.lng}`
        });
        
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    }
  };

  return (
    <div className="left-menu">
      <div className="menu-header">
        <svg xmlns="http://www.w3.org/2000/svg" className="menu-icon" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <h2>Menu</h2>
      </div>

      <div className="menu-section">
        <div className="section-header">
          <svg xmlns="http://www.w3.org/2000/svg" className="section-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <h3>Search</h3>
        </div>
        <div className="research-bar">
          <input
            type="text"
            placeholder="Profiles or projects..."
            value={searchTerm}
            onChange={handleSearch}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
          {showResults && searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((result, index) => (
                <li
                  key={`${result.id}-${result.type}-${index}`}
                  onClick={() => handleSelectResult(result)}
                >
                  {result.name} <span>({result.type})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>


      {isConnected && (
        <div className="menu-section">
          <div className="section-header">
            <svg xmlns="http://www.w3.org/2000/svg" className="section-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z" />
            </svg>
            <h3>Navigation</h3>
          </div>
          <div className="menu-btn-group">
            <button 
              className={getButtonClass("profile")}
              onClick={() => handleNavigation("/profile", "profile")}
              ref={el => buttonRefs.current.profile = el}
            >
              Profile
            </button>
            <button 
              className={getButtonClass("events")}
              onClick={() => handleNavigation("/events", "events")}
              ref={el => buttonRefs.current.events = el}
            >
              Projects
            </button>
            <button 
              className={getButtonClass("circles")}
              onClick={() => handleNavigation("/circles", "circles")}
              ref={el => buttonRefs.current.circles = el}
            >
              Circles
            </button>
          </div>
        </div>

      )}

      <div className="menu-section">
        <div className="section-header">
          <svg xmlns="http://www.w3.org/2000/svg" className="section-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <h3>Account</h3>
        </div>
        {!isConnected ? (
          <div className="menu-btn-group">
            <button 
              className={getButtonClass("create-account")}
              onClick={() => handleNavigation("/create-account", "create-account")}
              ref={el => buttonRefs.current["create-account"] = el}
            >
              Create Account
            </button>
            <button 
              className={getButtonClass("login")}
              onClick={() => handleNavigation("/login", "login")}
              ref={el => buttonRefs.current.login = el}
            >
              Login
            </button>
          </div>
        ) : (
          <div className="menu-btn-group">
            <button 
              className={`menu-btn disconnect ${clickingButton === "disconnect" ? "menu-btn-clicking" : ""}`} 
              onClick={handleDisconnect}
              ref={el => buttonRefs.current.disconnect = el}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      
    </div>
  );
};

export default LeftMenu;
