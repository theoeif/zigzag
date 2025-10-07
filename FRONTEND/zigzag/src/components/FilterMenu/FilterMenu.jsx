import React from "react";
import { OpenCageGeoSearchPlugin } from "@opencage/geosearch-core";
import GeoSearch from "./GeoSearch";
import "@algolia/autocomplete-theme-classic";
import "../../index.css";
import { OPENCAGE_SEARCH_TOKEN } from "../../config";


const predefinedLocations = [
  { label: "France", lat: 46.603354, lng: 1.888334, zoom: 6 },
  { label: "Europe", lat: 54.5260, lng: 15.2551,  zoom: 4 },
  { label: "World", lat: 60, lng: 0,  zoom: 2.4 },
];

const FilterMenu = ({
  toggleClustering,
  isClustered,
  tags,
  selectedTags,
  handleTagSelection,
  closeMenu,
  setSelectedLocation,
  showProjects,
  setShowProjects,
  showFriendLocations,
  setShowFriendLocations,
  disableClustering
}) => {
  const options = {
    key: OPENCAGE_SEARCH_TOKEN,
    language: "fr",
    limit: 5,
  };

  const handleSelectSuggestion = (location) => {
    if (location.item) {
      let lat, lng, zoom;
      if ("lat" in location.item && "lng" in location.item) {
        lat = location.item.lat;
        lng = location.item.lng;
        zoom = location.item.zoom || 12;
      } else if (location.item.geometry) {
        lat = parseFloat(location.item.geometry.lat);
        lng = parseFloat(location.item.geometry.lng);
        zoom = location.item.bounds ? 
          Math.max(4, Math.min(16, Math.floor(12 - Math.log(
            Math.abs(parseFloat(location.item.bounds.northeast.lat) - 
            parseFloat(location.item.bounds.southwest.lat)) + 
            Math.abs(parseFloat(location.item.bounds.northeast.lng) - 
            parseFloat(location.item.bounds.southwest.lng))
          )))) : 12;
      }

      if (lat !== undefined && lng !== undefined) {
        setSelectedLocation({ lat, lng, zoom });
      }
    }
  };

  const plugin = OpenCageGeoSearchPlugin(options, {
    onSelect: handleSelectSuggestion,
  });

  return (
    <div className="filter-menu">
      <div className="menu-header">
        <button className="close-button" onClick={closeMenu}>
          <svg
            className="menu-icon"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h2>filtres</h2>
      </div>

      {/* Location Search Section - Moved to top */}
      <div className="filter-section">
        <div className="section-header">
          <svg xmlns="http://www.w3.org/2000/svg" className="section-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <h3>localisation</h3>
        </div>
        <div className="geo-search-wrapper">
          <GeoSearch
            openOnFocus={true}
            plugins={[plugin]}
            getSources={({ query }) => {
              const hardcodedResults = predefinedLocations.filter(({ label }) =>
                label.toLowerCase().startsWith(query.toLowerCase())
              );

              return [
                {
                  sourceId: "Hardcoded Locations",
                  getItems: () => hardcodedResults,
                  templates: {
                    item({ item }) {
                      return `${item.label}`;
                    },
                  },
                  onSelect: handleSelectSuggestion,
                },
              ];
            }}
            onSubmit={(e) => console.log("Autocomplete submitted:", e)}
            onInput={({ state }) => console.log("Input State:", state)}
          />
        </div>
      </div>

      {/* Visibility Section */}
      <div className="filter-section">
        <div className="section-header">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <h3>Visibilité</h3>
        </div>
        
        <div className="toggle-group">
          <div className="toggle-label">
            <div className="label-with-icon">
              Projets
              <div className="info-icon" title="Visibilité des marqueurs de projets sur la carte">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={showProjects}
              onChange={() => setShowProjects(!showProjects)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="toggle-group">
          <div className="toggle-label">
            <div className="label-with-icon">
              Autres lieux
              <div className="info-icon" title="Visibilité de lieux sur la carte">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={showFriendLocations}
              onChange={() => setShowFriendLocations(!showFriendLocations)}
            />
            <span className="slider"></span>
          </label>
        </div>

        

        <div className="toggle-group">
          <div className="toggle-label">
            <div className="label-with-icon">
              Regroupement
              <div className="info-icon" title="Regroupement des marqueurs proches entre eux">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
            </div>
          </div>
          <label className={`switch ${disableClustering ? 'disabled' : ''}`}>
            <input
              type="checkbox"
              checked={isClustered}
              onChange={toggleClustering}
              disabled={disableClustering}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Tags Section */}
      <div className="filter-section">
        <div className="section-header">
          <svg xmlns="http://www.w3.org/2000/svg" className="section-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          <h3>Tags</h3>
        </div>
        <div className="tag-grid">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={`tag-item ${
                selectedTags.includes(tag.id) ? "selected" : ""
              }`}
              onClick={() => handleTagSelection(tag.id)}
            >
              <input
                type="checkbox"
                checked={selectedTags.includes(tag.id)}
                onChange={() => {}}
                className="sr-only"
              />
              <div className="custom-checkbox"></div>
              <span className="tag-label">{tag.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterMenu;