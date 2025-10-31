import React from 'react';
import '../../index.css'
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
import { FaFilter } from 'react-icons/fa'; // Import FaFilter if needed
import { CalendarToday, Folder, Map, Menu } from '@mui/icons-material';

const Header = ({ toggleLeftMenu, toggleFilterMenu, hideNavigationIcons = false, showRightMapIcon = false }) => {
  const navigate = useNavigate(); // Initialize the useNavigate hook

  const handleLogoClick = () => {
    navigate('/'); // Navigate to the home page
  };

  const handleCalendarClick = () => {
    navigate('/calendar'); // Navigate to calendar page
  };

  const handleProjectsClick = () => {
    navigate('/events'); // Navigate to projects page
  };

  const handleMapClick = () => {
    navigate('/'); // Navigate to main map
  };

  return (
    <div className="header">
      <div className="header-left-actions">
        <button className="left-menu-icon" onClick={toggleLeftMenu}>
          <Menu />
        </button>
        {!hideNavigationIcons && (
          <button className="map-icon" onClick={handleMapClick} title="Carte">
            <Map />
          </button>
        )}
      </div>
      <h1 className="app-title" onClick={handleLogoClick}>zig zag</h1>
      <div className="header-actions">
        {!hideNavigationIcons && (
          <>
            <button className="projects-icon" onClick={handleProjectsClick} title="Projets">
              <Folder />
            </button>
            <button className="calendar-icon" onClick={handleCalendarClick} title="Calendrier">
              <CalendarToday />
            </button>
          </>
        )}
        {showRightMapIcon && (
          <button className="map-icon" onClick={handleMapClick} title="Carte">
            <Map />
          </button>
        )}
        {/* Only render the filter button if toggleFilterMenu is passed */}
        {toggleFilterMenu && (
          <button className="filter-icon" onClick={toggleFilterMenu}>
            <FaFilter />
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
