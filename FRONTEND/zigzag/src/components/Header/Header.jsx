import React from 'react';
import '../../index.css'
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
import { FaFilter } from 'react-icons/fa'; // Import FaFilter if needed

const Header = ({ toggleLeftMenu, toggleFilterMenu }) => {
  const navigate = useNavigate(); // Initialize the useNavigate hook

  const handleLogoClick = () => {
    navigate('/'); // Navigate to the home page
  };

  return (
    <div className="header">
      <button className="left-menu-icon" onClick={toggleLeftMenu}>☰</button>
      <h1 className="app-title" onClick={handleLogoClick}>zig zag</h1> {/* Add click handler here */}
      {/* Only render the filter button if toggleFilterMenu is passed */}
      {toggleFilterMenu && (
        <button className="filter-icon" onClick={toggleFilterMenu}>
          <FaFilter />
        </button>
      )}
    </div>
  );
};

export default Header;
