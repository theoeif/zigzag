import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MAPBOX_SEARCH_TOKEN } from '../../config';
import './MapboxAutocomplete.css';

const MapboxAutocomplete = ({ onSelectLocation }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const sessionTokenRef = useRef(generateSessionToken());
  const debounceTimerRef = useRef(null);
  const containerRef = useRef(null);

  // Generate UUID v4 session token
  function generateSessionToken() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Fetch suggestions from Mapbox API
  const fetchSuggestions = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sessionToken = sessionTokenRef.current;
      // Add country=FR to prioritize French results and include region types
      const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(searchQuery)}&session_token=${sessionToken}&limit=10&&proximity=ip&access_token=${MAPBOX_SEARCH_TOKEN}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Sort suggestions to prioritize French results first, then hierarchical order
      const sortedSuggestions = (data.suggestions || []).sort((a, b) => {
        // First, check if result is in France (context is an object, not array)
        const aIsFR = a.context?.country?.country_code === 'FR';
        const bIsFR = b.context?.country?.country_code === 'FR';
        
        // French results come first
        if (aIsFR && !bIsFR) return -1;
        if (!aIsFR && bIsFR) return 1;
        
        // If both or neither in France, sort by hierarchical order
        const getPriority = (suggestion) => {
          const type = suggestion.feature_type;
          
          if (type === 'country') return 1;
          if (type === 'region') return 2;
          if (type === 'place' || type === 'city') return 3;
          if (type === 'address') return 4;
          if (type === 'poi') return 5;
          return 6; // unknown types go last
        };
        
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        
        return aPriority - bPriority;
      }).slice(0, 5); // Take top 5
      
      setSuggestions(sortedSuggestions);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Impossible de charger les suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Fetch detailed location data when suggestion is selected
  const retrieveLocation = async (suggestion) => {
    setLoading(true);
    setError(null);

    try {
      const sessionToken = sessionTokenRef.current;
      const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?session_token=${sessionToken}&access_token=${MAPBOX_SEARCH_TOKEN}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.geometry.coordinates;
        
        // Calculate zoom level from bounds if available
        let zoom = 12;
        
        // Determine feature type to set appropriate zoom
        const featureType = suggestion.feature_type;
        
        if (feature.properties.bbox) {
          const bbox = feature.properties.bbox;
          const latDiff = bbox[3] - bbox[1];
          const lngDiff = bbox[2] - bbox[0];
          const maxDiff = Math.max(latDiff, lngDiff);
          
          // Use type-based zoom for better accuracy
          if (featureType === 'poi') {
            // POIs (like "Arkose Nation") - zoom to building level
            zoom = 16;
          } else if (featureType === 'address') {
            // Addresses - zoom to street level
            zoom = 15;
          } else if (featureType === 'country') {
            zoom = 6;
          } else if (featureType === 'region') {
            // Regions and places - zoom based on size
            // Large regions like France (10+ degrees) get zoom 5, smaller regions get 7-8
            if (maxDiff > 10) zoom = 5;
            else if (maxDiff > 5) zoom = 6;
            else if (maxDiff > 1) zoom = 8;
            else zoom = 10;
          } else if (maxDiff > 50) zoom = 3;
          else if (maxDiff > 20) zoom = 5;
          else if (maxDiff > 5) zoom = 8;
          else if (maxDiff > 1) zoom = 10;
          else if (maxDiff > 0.1) zoom = 14;
          else zoom = 15;
        } else {
          // Default zoom based on type
          if (featureType === 'poi') zoom = 16;
          else if (featureType === 'address') zoom = 15;
          else if (featureType === 'region' || featureType === 'place') zoom = 6;
        }

        // Call the parent callback with location data
        onSelectLocation({ lat, lng, zoom });
        
        // Reset query and suggestions
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        
        // Generate new session token for next search
        sessionTokenRef.current = generateSessionToken();
      }
    } catch (err) {
      console.error('Error retrieving location:', err);
      setError('Impossible de charger les détails de la localisation');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (suggestion) => {
    retrieveLocation(suggestion);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          retrieveLocation(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mapbox-autocomplete" ref={containerRef}>
      <div className="mapbox-autocomplete-input-wrapper">
        <input
          type="text"
          className="mapbox-autocomplete-input"
          placeholder="Rechercher un lieu..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
        />
        {loading && (
          <div className="mapbox-autocomplete-spinner">
            <div className="spinner"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="mapbox-autocomplete-error">{error}</div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="mapbox-autocomplete-suggestions">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.mapbox_id || index}
              className={`mapbox-autocomplete-suggestion ${
                index === selectedIndex ? 'selected' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="suggestion-main-text">
                {suggestion.name || suggestion.full_address || ''}
              </div>
              <div className="suggestion-context">
                {suggestion.full_address && suggestion.name !== suggestion.full_address 
                  ? suggestion.full_address 
                  : (Array.isArray(suggestion.context) && suggestion.context.length > 0
                      ? suggestion.context.map(ctx => ctx.name).join(', ')
                      : '')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapboxAutocomplete;
