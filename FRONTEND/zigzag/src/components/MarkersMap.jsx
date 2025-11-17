import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from '@mui/material';
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import { MAPTILER_API_KEY } from "../config";

import { fetchMarkers, fetchMyTags, persistSelectedTags, fetchMyLocations } from "../api/api";
import {
  redMarkerIcon,
  whiteFriendsEventlocationMarkerIcon
} from "../assets/customMarkers";

import Header from "./Header/Header";
import LeftMenu from "./LeftMenu/LeftMenu";
import FilterMenu from "./FilterMenu/FilterMenu";
import Map from "./Map/Map";
import { AuthContext } from "../contexts/AuthProvider";
import { MapContext } from "../contexts/MapContext.jsx";
import CreateEventForm from "./Project/CreateEventForm";
import MapControls from "./MapControls/MapControls";
import { shouldShowAppBanner } from '../utils/mobileDetection';
import AppRedirectBanner from './AppRedirectBanner/AppRedirectBanner';

const MarkersMap = ({ eventCoordinates = null }) => {
  const isBackground = !!eventCoordinates;
  const isSmallScreen = useMediaQuery('(max-width:599px)');
  // Authentication and header state
  const { isConnected } = useContext(AuthContext);
  const [isFilterOpen, setisFilterOpen] = useState(false);
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [isClustered, setIsClustered] = useState(false);
  
  // App redirect banner state
  const [showAppBanner, setShowAppBanner] = useState(false);
  const location = useLocation();
  const eventIdFromState = location.state?.eventId;
  const fromEvent = location.state?.fromEvent;

  // Toggle state for projects and my locations
  const [showProjects, setShowProjects] = useState(true);
  const [showFriendLocations, setShowFriendLocations] = useState(true);
  const [showEvents, setShowEvents] = useState(false);


  // Timeframe is now managed by MapContext

  // Refs to track previous filter states for auto-untoggling
  const prevShowProjectsRef = useRef(showProjects);
  const prevShowFriendLocationsRef = useRef(showFriendLocations);

  // Markers state: full markers data and filtered markers for timeline
  const [markersData, setMarkersData] = useState({ red_markers: [] });
  const [filteredMarkers, setFilteredMarkers] = useState({ red_markers: [] });
  const [friendLocationData, setFriendLocationData] = useState([]);

  // Create Event form modal visibility
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Precision threshold for close markers (in kilometers)
  const CLOSE_MARKERS_THRESHOLD = 0.05; // 50 meters
  // Threshold for offset calculation (in degrees)
  const OFFSET_THRESHOLD = 0.02; // Approximately 2 km
  // Offset value for friend markers when too close to project markers (in degrees)
  const MARKER_OFFSET = 0.005; // Small offset to northeast
  // Larger offset for close markers (in degrees)
  const CLOSE_MARKER_OFFSET = 0.010; // Double offset for close markers

  // Tags and location
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Refs for the map and markers
  const projectClusterGroupRef = useRef(
    L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: 'marker-cluster project-cluster',
          iconSize: L.point(40, 40)
        });
      }
    })
  );

  const closeProjectClusterGroupRef = useRef(
    L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: 'marker-cluster close-project-cluster',
          iconSize: L.point(32, 32)
        });
      }
    })
  );

  const friendClusterGroupRef = useRef(
    L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: 'marker-cluster friend-cluster',
          iconSize: L.point(40, 40)
        });
      }
    })
  );

  const closeFriendClusterGroupRef = useRef(
    L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: 'marker-cluster close-friend-cluster',
          iconSize: L.point(32, 32)
        });
      }
    })
  );



  const individualMarkersRef = useRef([]);
  const mapRef = useRef(null);

  // Get mapState and timeframe from context and navigation state
  const { mapState: contextMapState, setMapState, timeframe: contextTimeframe, setTimeframe: setContextTimeframe } = useContext(MapContext);
  const navigate = useNavigate();
  // const location = useLocation();

  // Use only MapContext for map state management
  // Navigation state is only used for passing data, not for map positioning
  const mapState = contextMapState;
  const timeframe = contextTimeframe;


  /**
   * Handle zoom level changes to determine when to show/hide close markers
   */
  const handleZoomChange = useCallback(() => {
    if (!mapRef.current) return;

    const currentZoom = mapRef.current.getZoom();

    // We don't need to do anything special here as we're handling
    // close markers based on proximity, not zoom level
    // This hook is maintained for future zoom-based optimizations
  }, []);


  /**
   * Initialize the map.
   */
  const initializeMap = async (map) => {
    mapRef.current = map;

    // Set zoom limits
    map.setMinZoom(2);
    map.setMaxZoom(18);

    // Initialize the marker cluster groups
    projectClusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: 'marker-cluster project-cluster',
          iconSize: L.point(40, 40)
        });
      }
    });

    closeProjectClusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: 'marker-cluster close-project-cluster',
          iconSize: L.point(32, 32)
        });
      }
    });

    friendClusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: 'marker-cluster friend-cluster',
          iconSize: L.point(40, 40)
        });
      }
    });

    closeFriendClusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: 'marker-cluster close-friend-cluster',
          iconSize: L.point(32, 32)
        });
      }
    });



    // Add a one-time listener for zoom changes to match integer zoom levels
    map.once('zoomend', () => {
      const currentZoom = map.getZoom();
      if (Math.abs(currentZoom - Math.round(currentZoom)) > 0.1) {
        map.setZoom(Math.round(currentZoom), {animate: false});
      }
    });

    L.maplibreGL({
      style:
        `https://api.maptiler.com/maps/0199a425-b17a-78e9-9d91-e1123d890474/style.json?key=${MAPTILER_API_KEY}`,
    }).addTo(map);

    // Remplacer l'attribution Leaflet par un lien "© Credits"
    map.attributionControl.setPrefix(false); // Enlever le préfixe "Leaflet"
    map.attributionControl.addAttribution(
      '<a href="/help#credits" style="color: #064e3b; text-decoration: none;">© MapTiler | © OpenStreetMap</a>'
    );

    // Ajouter le logo MapTiler comme contrôle Leaflet
    const maptilerLogo = L.control({ position: 'bottomleft' });
    maptilerLogo.onAdd = function(map) {
      const div = L.DomUtil.create('div', 'maptiler-logo-control');
      div.innerHTML = '<a href="https://www.maptiler.com" target="_blank" rel="noopener noreferrer"><img src="/maptiler-logo-dark-long.svg" alt="MapTiler logo" style="height: 20px; width: auto;"></a>';
      return div;
    };
    maptilerLogo.addTo(map);

    // Prevent world wrapping - set max bounds to the world
    const worldBounds = L.latLngBounds(
      L.latLng(-70, -160),  // Southwest corner
      L.latLng(85, 160)     // Northeast corner - increased to include Greenland
    );
    map.setMaxBounds(worldBounds);
    map.options.maxBoundsViscosity = 0.8; // Make bounds somewhat solid

    // Disable wrapping of longitude
    map.options.noWrap = true;

    // Set standard zoom behavior
    map.options.zoomSnap = 1.0;
    map.options.zoomDelta = 1.0;

    // Special handler for the World view zoom level
    map.on('zoomend', function() {
      // When selectedLocation is set to World view
      if (selectedLocation &&
          selectedLocation.lat === 60 &&
          selectedLocation.lng === 0 &&
          selectedLocation.zoom === 2.4) {
        // Don't adjust the zoom, keep it at 2.2
        return;
      }

      // For all other zooms, ensure we're at integer levels
      const currentZoom = map.getZoom();
      if (Math.abs(currentZoom - Math.round(currentZoom)) > 0.1) {
        map.setZoom(Math.round(currentZoom), {animate: false});
      }
    });

    // Set up close marker detection handler
    map.on('zoomend', handleZoomChange);

    if (mapState) {
      const lat = mapState.lat || mapState.center?.lat;
      const lng = mapState.lng || mapState.center?.lng;
      const zoom = mapState.zoom || 15;
      if (lat && lng) {
        map.setView([lat, lng], zoom);
      }
    } else if (selectedLocation) {
      map.setView(
        [selectedLocation.lat, selectedLocation.lng],
        selectedLocation.zoom || 12
      );
    }

    // Make sure the map is the correct size
    map.invalidateSize();

    // Render markers initially if available
    setTimeout(() => {
      renderMarkers();
    }, 100);
  };

  /**
   * Filter markers based on the current timeframe.
   * The logic here:
   * - Include events that start within the range.
   * - Include events that end within the range.
   * - Include events that span across the entire timeframe.
   *
   */
  const filterMarkersByTimeframe = useCallback(() => {
    // Clone dates to avoid modifying original values
    const rawStart = new Date(timeframe.start);
    const rawEnd = new Date(timeframe.end);

    // Normalize dates to cover full days
    const start = new Date(rawStart);
    start.setHours(0, 0, 0, 0);  // Set to 00:00:00

    const end = new Date(rawEnd);
    end.setHours(23, 59, 59, 999);  // Set to 23:59:59.999

    const filterFunc = (event) => {
      // Always include my locations regardless of date - they don't have real start/end dates
      if (event.isFriendLocation) return true;

      // Skip filtering if marker doesn't have date information
      if (!event.start_date && !event.end_date) return true;

      // For regular events, apply date filtering
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);

      // If showEvents is enabled, check if event duration is 24 hours or less
      if (showEvents) {
        const durationMs = eventEnd.getTime() - eventStart.getTime();
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000; // 86,400,000 milliseconds
        if (durationMs > TWENTY_FOUR_HOURS_MS) {
          return false; // Event duration exceeds 24 hours
        }
      }

      return (
        // Case 1: Event starts within the filter range
        (eventStart >= start && eventStart <= end) ||

        // Case 2: Event ends within the filter range
        (eventEnd >= start && eventEnd <= end) ||

        // Case 3: Event completely contains the filter range
        (eventStart <= start && eventEnd >= end) ||

        // Case 4: Event is completely within the filter range
        (eventStart >= start && eventEnd <= end)
      );
    };

    // Apply visibility filters along with date filtering for red markers
    const filteredRed = (showProjects || showEvents)
      ? markersData.red_markers.filter(filterFunc)
      : [];

    // Use stored my location data for blue markers (only when showing my locations)
    const filteredBlue = showFriendLocations ? friendLocationData : [];

    setFilteredMarkers({ red_markers: filteredRed });
  }, [markersData, friendLocationData, timeframe, showProjects, showFriendLocations, showEvents]);

  // Update filtered markers whenever markersData or timeframe changes.
  useEffect(() => {
    // Always call filterMarkersByTimeframe, even if markersData is empty
    filterMarkersByTimeframe();
  }, [markersData, timeframe.start, timeframe.end, showProjects, showFriendLocations, showEvents, filterMarkersByTimeframe]);

  /**
   * Refresh markers based on selected tags and public markers.
   */
  const refreshMarkersForSelectedTags = useCallback(async () => {
    // If user is connected, fetch their markers
    if (isConnected) {
      // Pass selectedTags (can be empty array for all markers)
      const tagsToUse = Array.isArray(selectedTags) ? selectedTags : [];
      const markers = await fetchMarkers(tagsToUse);

      // Always update state, even if markers is null or empty
      // This ensures the UI reflects the current filter state
      setMarkersData(markers || { red_markers: [] });
    }
  }, [isConnected, selectedTags]);

  /**
  * Fetch my saved locations separately
   */
  const loadFriendLocations = async () => {
    try {
      const friendLocations = await fetchMyLocations();

      if (!friendLocations || !Array.isArray(friendLocations) || friendLocations.length === 0) {
        console.warn("No my locations data returned");
        return;
      }

      // Transform my locations into the proper format for markers
      const friendMarkers = friendLocations
        .filter(location => {
          // Filter out locations with invalid coordinates
          const hasValidLat = location.lat !== undefined && location.lat !== null && location.lat !== -1;
          const hasValidLng = location.lng !== undefined && location.lng !== null && location.lng !== -1;
          return hasValidLat && hasValidLng;
        })
        .map((location, index) => {
          // Construct name from available fields
          let name = "";
          if (location.first_name || location.last_name) {
            name = `${location.first_name || ''} ${location.last_name || ''}`.trim();
          } else {
            // Use address as name if no proper name is available (but not the label)
            name = location.address_line || 'My Location';
          }

          // Create a TRULY unique ID by combining user_id, coordinates, and index
          // This ensures even locations with the same user_id are treated as distinct
          const uniqueId = `${location.user_id_str || 'user'}-${location.lat}-${location.lng}-${index}`;

          return {
            id: uniqueId,
            user_id: location.user_id_str, // Changed from user_id to user_id_str
            username: location.username,
            title: name,
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lng),
            address_line: location.address_line,
            label: location.label,
            start_date: new Date(), // Current date as default
            end_date: new Date(new Date().setMonth(new Date().getMonth() + 3)),
            isFriendLocation: true
          };
        });

      setFriendLocationData(friendMarkers);
    } catch (error) {
      console.error("Error loading friend locations:", error);
    }
  };

  /**
   * Calculate distance between two geographical points (Haversine formula)
   * @param {number} lat1 - Latitude of first point
   * @param {number} lng1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lng2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  /**
   * Group markers that are too close to each other
   * @param {Array} markers - Array of marker data objects
   * @returns {Object} Object with closeMarkers and normalMarkers arrays
   */
  const groupCloseMarkers = (markers) => {
    if (!markers || !Array.isArray(markers)) {
      console.warn("Invalid markers data provided to groupCloseMarkers", markers);
      return { closeMarkers: [], normalMarkers: [] };
    }

    // Filter out markers with invalid coordinates
    const validMarkers = markers.filter(m =>
      m && typeof m === 'object' &&
      m.lat !== undefined && m.lat !== null && m.lat !== -1 &&
      m.lng !== undefined && m.lng !== null && m.lng !== -1
    );

    if (validMarkers.length === 0) {
      return { closeMarkers: [], normalMarkers: [] };
    }

    // Use Set to track which markers have been processed
    const processedIds = new Set();

    // Create arrays for close and normal markers
    const closeMarkers = [];
    const normalMarkers = [];

    // First pass: identify markers with close neighbors
    for (let i = 0; i < validMarkers.length; i++) {
      const current = validMarkers[i];

      // Skip if already processed
      if (processedIds.has(current.id)) {
        continue;
      }

      // Find all markers that are close to the current one
      const neighbors = validMarkers.filter((m, index) =>
        index !== i && // Not the same marker
        !processedIds.has(m.id) && // Not already processed
        calculateDistance(current.lat, current.lng, m.lat, m.lng) <= CLOSE_MARKERS_THRESHOLD
      );

      if (neighbors.length > 0) {
        // Current marker has close neighbors - add to close group
        processedIds.add(current.id);
        closeMarkers.push({
          ...current,
          isCloseMarker: true
        });

        // Process all neighbors
        neighbors.forEach(neighbor => {
          // Mark as processed and add to close markers
          processedIds.add(neighbor.id);
          closeMarkers.push({
            ...neighbor,
            isCloseMarker: true
          });
        });
      }
    }

    // Second pass: add all remaining unprocessed markers as normal
    for (const marker of validMarkers) {
      if (!processedIds.has(marker.id)) {
        normalMarkers.push(marker);
        processedIds.add(marker.id);
      }
    }

    // Verify all markers are accounted for
    if (closeMarkers.length + normalMarkers.length !== validMarkers.length) {
      console.error(`Marker count mismatch! Input: ${validMarkers.length}, Output: ${closeMarkers.length + normalMarkers.length}`);
    }

    return { closeMarkers, normalMarkers };
  };

  /**
  * Calculate if a my location marker is too close to any project marker
   * @param {Object} friendMarker - Friend marker data
   * @param {Array} projectMarkers - Array of project marker data
   * @returns {boolean} True if markers are too close
   */
  const isTooCloseToProject = (friendMarker, projectMarkers) => {
    if (!friendMarker || !friendMarker.lat || !friendMarker.lng || !projectMarkers || !Array.isArray(projectMarkers)) {
      return false;
    }

    return projectMarkers.some(projectMarker => {
      if (!projectMarker || !projectMarker.lat || !projectMarker.lng) {
        return false;
      }

      // Check if coordinate distance is less than threshold
      const latDiff = Math.abs(friendMarker.lat - projectMarker.lat);
      const lngDiff = Math.abs(friendMarker.lng - projectMarker.lng);

      return latDiff < OFFSET_THRESHOLD && lngDiff < OFFSET_THRESHOLD;
    });
  };

  /**
  * Apply small offset to my location markers that are too close to project markers
   * @param {Array} friendMarkers - Array of friend marker data
   * @param {Array} projectMarkers - Array of project marker data
   * @returns {Array} New array of friend markers with offset applied where needed
   */
  const applyFriendMarkerOffset = (friendMarkers, projectMarkers) => {
    if (!friendMarkers || !Array.isArray(friendMarkers) || !projectMarkers || !Array.isArray(projectMarkers)) {
      return friendMarkers || [];
    }

    return friendMarkers.map(friendMarker => {
      if (!friendMarker || !friendMarker.lat || !friendMarker.lng) {
        return friendMarker;
      }

      // Only apply offset when both filter types are active
      if (showProjects && showFriendLocations) {
        // Find if this marker is close to any project marker
        const closeProject = projectMarkers.find(projectMarker => {
          if (!projectMarker || !projectMarker.lat || !projectMarker.lng) {
            return false;
          }

          // Check if coordinate distance is less than threshold
          const latDiff = Math.abs(friendMarker.lat - projectMarker.lat);
          const lngDiff = Math.abs(friendMarker.lng - projectMarker.lng);

          return latDiff < OFFSET_THRESHOLD && lngDiff < OFFSET_THRESHOLD;
        });

        if (closeProject) {
          // Apply normal or larger offset based on whether the markers are "close" markers
          const offsetAmount = (friendMarker.isCloseMarker && closeProject.isCloseMarker)
            ? CLOSE_MARKER_OFFSET
            : MARKER_OFFSET;

          return {
            ...friendMarker,
            lat: friendMarker.lat + offsetAmount,
            lng: friendMarker.lng + offsetAmount,
            hasOffset: true,
            offsetAmount: offsetAmount // Store the amount for debugging
          };
        }
      }

      return friendMarker;
    });
  };



  /**
   * Render all markers on the map.
   */
  const renderMarkers = useCallback(() => {
    // Always run cleanup first, even if there are no markers to show
    if (!mapRef.current) {
      return;
    }

    // Clean up existing layers
    const cleanupLayer = (layerRef) => {
      if (layerRef.current) {
        if (mapRef.current.hasLayer(layerRef.current)) {
          mapRef.current.removeLayer(layerRef.current);
        }
        layerRef.current.clearLayers();
      }
    };

    // Clean up all cluster groups
    cleanupLayer(projectClusterGroupRef);
    cleanupLayer(closeProjectClusterGroupRef);
    cleanupLayer(friendClusterGroupRef);
    cleanupLayer(closeFriendClusterGroupRef);


    // Remove any individual markers
    individualMarkersRef.current.forEach(marker => {
      if (marker && mapRef.current.hasLayer(marker)) {
        mapRef.current.removeLayer(marker);
      }
    });
    individualMarkersRef.current = [];

    // If no markers to show, we're done (map is now cleared)
    if (!filteredMarkers.red_markers?.length && !friendLocationData?.length) {
      return;
    }

    const projectMarkers = (showProjects || showEvents) ? filteredMarkers.red_markers : [];
    const friendMarkers = showFriendLocations ? friendLocationData : [];

    // Apply offset to friend markers if too close to project markers
    const processedFriendMarkers = applyFriendMarkerOffset(friendMarkers, projectMarkers);



    // Determine display mode based on filters and clustering settings
    const showOnlyProjects = (showProjects || showEvents) && !showFriendLocations;
    const showOnlyFriends = !(showProjects || showEvents) && showFriendLocations;
    const showBoth = (showProjects || showEvents) && showFriendLocations;

    // Only use clustering for:
    // 1. Close markers (always cluster these)
    // 2. Normal markers when clustering is enabled AND not showing both filters
    const useClusteringForNormal = showBoth ? false : isClustered;

    // Group project markers
    const projectMarkersGroups = (showProjects || showEvents) ? groupCloseMarkers(projectMarkers) : { closeMarkers: [], normalMarkers: [] };

    // Group friend markers
    const friendMarkersGroups = showFriendLocations ? groupCloseMarkers(processedFriendMarkers) : { closeMarkers: [], normalMarkers: [] };

    // Process close project markers - always cluster these
    const processCloseProjectMarkers = () => {
      projectMarkersGroups.closeMarkers.forEach(markerData => {
        if (!markerData.lat || !markerData.lng) return;

        const marker = L.marker([markerData.lat, markerData.lng], {
          icon: redMarkerIcon,
          alt: 'closeProjectMarker'
        });

        marker.bindTooltip(`
          <div class="tooltip-content">
            <div class="tooltip-title">${markerData.title}</div>
            ${(markerData.address_line || (markerData.address && markerData.address.address_line)) ? `<div class="tooltip-address">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 384 512" fill="#2196F3">
                <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
              </svg>
              ${(markerData.address_line || (markerData.address && markerData.address.address_line))}
            </div>` : ''}
            ${markerData.tags && markerData.tags.length ? `<div class="tooltip-tags" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;">${markerData.tags.map(tag => `<span class="tooltip-tag" style="background-color: #f0f7f4; color: #2d6a4f; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; text-transform: lowercase;">${tag}</span>`).join('')}</div>` : ''}
          </div>
        `, {
          direction: "top",
          opacity: 1,
          className: "custom-tooltip",
          offset: [0, -10],
        });

        marker.on("click", () => {
          // Update MapContext BEFORE navigating
          setMapState({
            center: { lat: markerData.lat, lng: markerData.lng },
            zoom: 15
          });
          navigate(`/event/${markerData.id}`, {
            state: {
              background: location,  // Tells App.jsx to keep map mounted
              mapState: {
                center: { lat: markerData.lat, lng: markerData.lng },
                zoom: 15
              },
              eventCoordinates: { lat: markerData.lat, lng: markerData.lng }
            },
          });
        });

        // When showing only projects and clustering is on, put close markers in the main cluster group
        // This allows close and normal project markers to merge into a single cluster
        if (showOnlyProjects && useClusteringForNormal) {
          projectClusterGroupRef.current.addLayer(marker);
        } else {
          // In other cases, keep close markers in a separate cluster
          closeProjectClusterGroupRef.current.addLayer(marker);
        }
      });
    };

    // Process normal project markers
    const processNormalProjectMarkers = () => {
      projectMarkersGroups.normalMarkers.forEach(markerData => {
        if (!markerData.lat || !markerData.lng) return;

        const marker = L.marker([markerData.lat, markerData.lng], {
          icon: redMarkerIcon,
          alt: 'normalProjectMarker'
        });

        marker.bindTooltip(`
          <div class="tooltip-content">
            <div class="tooltip-title">${markerData.title}</div>
            ${(markerData.address_line || (markerData.address && markerData.address.address_line)) ? `<div class="tooltip-address">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 384 512" fill="#2196F3">
                <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
              </svg>
              ${(markerData.address_line || (markerData.address && markerData.address.address_line))}
            </div>` : ''}
            ${markerData.tags && markerData.tags.length ? `<div class="tooltip-tags" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;">${markerData.tags.map(tag => `<span class="tooltip-tag" style="background-color: #f0f7f4; color: #2d6a4f; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; text-transform: lowercase;">${tag}</span>`).join('')}</div>` : ''}
          </div>
        `, {
          direction: "top",
          opacity: 1,
          className: "custom-tooltip",
          offset: [0, -10],
        });

        marker.on("click", () => {
          // Update MapContext BEFORE navigating so background map has correct coordinates
          setMapState({
            center: { lat: markerData.lat, lng: markerData.lng },
            zoom: 15
          });

          navigate(`/event/${markerData.id}`, {
            state: {
              background: location,  // Tells App.jsx to keep map mounted
              mapState: {
                center: { lat: markerData.lat, lng: markerData.lng },
                zoom: 15
              },
            },
          });
        });

        // Only cluster normal markers when:
        // - Only one filter is active (just projects or just friends), OR
        // - Clustering is enabled AND we're not showing both filters
        if (useClusteringForNormal) {
          projectClusterGroupRef.current.addLayer(marker);
        } else {
          // When both filter types are active, show as individual
          marker.addTo(mapRef.current);
          individualMarkersRef.current.push(marker);
        }
      });
    };

    // Process close friend markers - always cluster these
    const processCloseFriendMarkers = () => {
      friendMarkersGroups.closeMarkers.forEach(markerData => {
        if (!markerData.lat || !markerData.lng) return;

        // Improved name display logic
        // Only use title if it doesn't contain the address and isn't empty
        const hasValidName = markerData.title &&
                             markerData.title.trim() !== '' &&
                             (!markerData.address_line || !markerData.title.includes(markerData.address_line));

        // If no valid name is available, don't display a title
        const displayName = hasValidName ? markerData.title : '';

        const marker = L.marker([markerData.lat, markerData.lng], {
          icon: whiteFriendsEventlocationMarkerIcon,
          alt: 'closeFriendMarker'
        });

        marker.bindTooltip(`
          <div class="tooltip-content">
            ${displayName ? `<div class="tooltip-title">${displayName}</div>` : ''}
            ${markerData.address_line ? `<div class="tooltip-address">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 384 512" fill="#2196F3">
                <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
              </svg>
              ${markerData.address_line}
            </div>` : ''}
            <div class="tooltip-tags" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;">
              <span class="tooltip-tag" style="background-color: #f0f7f4; color: #2d6a4f; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; text-transform: lowercase;">
                ${markerData.label && markerData.label !== markerData.address_line ? markerData.label : 'No Label'}
              </span>
            </div>
          </div>
        `, {
          direction: "top",
          opacity: 1,
          className: "custom-tooltip",
          offset: [0, -10],
        });

        // Friend marker click functionality removed

        // When showing only friends and clustering is on, put close markers in the main friend cluster group
        // This allows close and normal friend markers to merge into a single cluster
        if (showOnlyFriends && useClusteringForNormal) {
          friendClusterGroupRef.current.addLayer(marker);
        } else {
          // In other cases, keep close friend markers in a separate cluster
          closeFriendClusterGroupRef.current.addLayer(marker);
        }
      });
    };

    // Process normal friend markers
    const processNormalFriendMarkers = () => {
      friendMarkersGroups.normalMarkers.forEach(markerData => {
        if (!markerData.lat || !markerData.lng) return;

        // Improved name display logic
        // Only use title if it doesn't contain the address and isn't empty
        const hasValidName = markerData.title &&
                             markerData.title.trim() !== '' &&
                             (!markerData.address_line || !markerData.title.includes(markerData.address_line));

        // If no valid name is available, don't display a title
        const displayName = hasValidName ? markerData.title : '';

        const marker = L.marker([markerData.lat, markerData.lng], {
          icon: whiteFriendsEventlocationMarkerIcon,
          alt: 'normalFriendMarker'
        });

        marker.bindTooltip(`
          <div class="tooltip-content">
            ${displayName ? `<div class="tooltip-title">${displayName}</div>` : ''}
            ${markerData.address_line ? `<div class="tooltip-address">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 384 512" fill="#2196F3">
                <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
              </svg>
              ${markerData.address_line}
            </div>` : ''}
            <div class="tooltip-tags" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;">
              <span class="tooltip-tag" style="background-color: #f0f7f4; color: #2d6a4f; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; text-transform: lowercase;">
                ${markerData.label && markerData.label !== markerData.address_line ? markerData.label : 'No Label'}
              </span>
            </div>
          </div>
        `, {
          direction: "top",
          opacity: 1,
          className: "custom-tooltip",
          offset: [0, -10],
        });

        // Friend marker click functionality removed

        // Make this exactly match the project marker logic for clustering
        if (useClusteringForNormal) {
          // When clustering is enabled, add to the cluster group
          friendClusterGroupRef.current.addLayer(marker);
        } else {
          // When clustering is disabled, add as individual marker
          marker.addTo(mapRef.current);
          individualMarkersRef.current.push(marker);
        }
      });
    };



    // Process markers based on filter state
    if (showProjects || showEvents) {
      processCloseProjectMarkers();
      processNormalProjectMarkers();
    }

    if (showFriendLocations) {
      processCloseFriendMarkers();
      processNormalFriendMarkers();
    }



    // Add the marker groups to the map as needed
    if (showProjects || showEvents) {
      // Only add close project clusters when they're not merged with main clusters
      if (closeProjectClusterGroupRef.current.getLayers().length > 0 && !(showOnlyProjects && useClusteringForNormal)) {
        mapRef.current.addLayer(closeProjectClusterGroupRef.current);
      }

      // Add normal project clusters only when useClusteringForNormal is true
      if (projectClusterGroupRef.current.getLayers().length > 0 && useClusteringForNormal) {
        mapRef.current.addLayer(projectClusterGroupRef.current);
      }
    }

    if (showFriendLocations) {
      // Add close friend clusters, but only when they're not merged with main clusters
      if (closeFriendClusterGroupRef.current.getLayers().length > 0 && !(showOnlyFriends && useClusteringForNormal)) {
        mapRef.current.addLayer(closeFriendClusterGroupRef.current);
      }

      // Add normal friend clusters only when useClusteringForNormal is true
      if (friendClusterGroupRef.current.getLayers().length > 0 && useClusteringForNormal) {
        mapRef.current.addLayer(friendClusterGroupRef.current);
      }
    }


  }, [filteredMarkers, isClustered, navigate, location.pathname, showProjects, showFriendLocations, showEvents, friendLocationData]);

  // Update markers on map when filtered markers change.
  useEffect(() => {
    // Always call renderMarkers when filteredMarkers changes, even if empty
    renderMarkers();
  }, [filteredMarkers, friendLocationData, isClustered, showProjects, showFriendLocations, renderMarkers]);

  // Close menus when clicking outside.
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInsideFilterMenu =
        e.target.closest(".filter-menu") || e.target.closest(".filter-icon");
      const isClickInsideSuggestionsList = e.target.closest(".suggestions-list");
      if (!isClickInsideFilterMenu && !isClickInsideSuggestionsList && isFilterOpen) {
        setisFilterOpen(false);
      }
      const isClickInsideLeftMenu =
        e.target.closest(".left-menu") || e.target.closest(".left-menu-icon");
      if (!isClickInsideLeftMenu) {
        setIsLeftMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isFilterOpen, selectedTags]);

  // Load tags and set default selections.
  useEffect(() => {
    if (isConnected && !isBackground) {
      const loadTags = async () => {
        const data = await fetchMyTags();
        if (data) {
          setTags(data);
          const savedSelections = JSON.parse(localStorage.getItem("selectedTags"));
          const defaultSelections = savedSelections || data.map((tag) => tag.id);
          setSelectedTags(defaultSelections);
        }
      };
      loadTags();
    }
  }, [isConnected, isBackground]);

  // Handle tag selection.
  const handleTagSelection = (tagId) => {
    setSelectedTags((prev) => {
      const updated = prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId];
      persistSelectedTags(updated);
      return updated;
    });
  };

  // Refresh markers when selectedTags is ready (non-null)
  useEffect(() => {
    if (isConnected && !isBackground && selectedTags !== null) {
      refreshMarkersForSelectedTags();
    }
  }, [selectedTags, isConnected, isBackground, refreshMarkersForSelectedTags]);

  // Update map view when clustering state changes.
  useEffect(() => {
    if (markersData.red_markers.length) {
      renderMarkers();
    }
  }, [isClustered, markersData]);

  // Handle clustering state when filters change
  useEffect(() => {
    // When both filters are turned on, clustering should be disabled and off
    if (showProjects && showFriendLocations) {
      setIsClustered(false);
    }
    // When switching from both filters to just one, clustering should be off by default
    else if ((prevShowProjectsRef.current && prevShowFriendLocationsRef.current) &&
             (showProjects !== showFriendLocations)) {
      setIsClustered(false);
    }
    // When one filter is explicitly turned off, turn clustering off
    else if ((prevShowProjectsRef.current && !showProjects) ||
             (prevShowFriendLocationsRef.current && !showFriendLocations)) {
      setIsClustered(false);
    }

    // Update refs for next render
    prevShowProjectsRef.current = showProjects;
    prevShowFriendLocationsRef.current = showFriendLocations;
  }, [showProjects, showFriendLocations]);

  // Mutual exclusion: disable showProjects when showEvents is enabled, and vice versa
  useEffect(() => {
    if (showEvents && showProjects) {
      setShowProjects(false);
    }
  }, [showEvents]);

  useEffect(() => {
    if (showProjects && showEvents) {
      setShowEvents(false);
    }
  }, [showProjects]);

  // Update map view when mapState changes.
  useEffect(() => {
    if (mapRef.current && mapState) {
      // Use MapContext coordinates directly
      const lat = mapState.center?.lat || mapState.lat;
      const lng = mapState.center?.lng || mapState.lng;
      const zoom = mapState.zoom || 15;
      if (lat && lng) {
        mapRef.current.setView([lat, lng], zoom);
      }
    }
  }, [mapState]);

  // Update map view when selectedLocation changes.
  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      const { lat, lng, zoom } = selectedLocation;
      mapRef.current.setView([lat, lng], zoom || 12);
    }
  }, [selectedLocation]);

  /**
   * Callback to update the filtering timeframe.
   * Expects an object with { start: Date, end: Date }.
   */
  const handleTimelineTimeChange = useCallback((range) => {
    setContextTimeframe({
      start: new Date(range.start),
      end: new Date(range.end)
    });
  }, [setContextTimeframe]);

  // Set timeframe to one year from today when user is disconnected
  // Reset to default (current date + 1 month) when user logs in
  useEffect(() => {
    if (!isBackground) {
      if (!isConnected) {
        // Disconnected: set to one year from today
        const start = new Date();
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);
        setContextTimeframe({ start, end });
      } else {
        // Connected: reset to default (current date + 1 month)
        const start = new Date();
        const end = new Date();
        end.setMonth(end.getMonth() + 2);
        setContextTimeframe({ start, end });
      }
    }
  }, [isConnected, isBackground, setContextTimeframe]);

  // Save map state when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function - runs when component unmounts
      if (mapRef.current) {
        const currentCenter = mapRef.current.getCenter();
        const currentZoom = mapRef.current.getZoom();
        
        // Save current map state to MapContext
        setMapState({
          center: { 
            lat: currentCenter.lat, 
            lng: currentCenter.lng 
          },
          zoom: currentZoom
        });
        
      }
    };
  }, []); // Remove setMapState from dependencies to prevent infinite loop

  // Save map state on map movements
  useEffect(() => {
    if (!mapRef.current) return;

    const saveMapState = () => {
      const currentCenter = mapRef.current.getCenter();
      const currentZoom = mapRef.current.getZoom();
      
      setMapState({
        center: { 
          lat: currentCenter.lat, 
          lng: currentCenter.lng 
        },
        zoom: currentZoom
      });
    };

    // Save state when user stops moving the map
    const map = mapRef.current;
    map.on('moveend', saveMapState);
    map.on('zoomend', saveMapState);

    // Cleanup event listeners
    return () => {
      map.off('moveend', saveMapState);
      map.off('zoomend', saveMapState);
    };
  }, []); // Remove setMapState from dependencies to prevent infinite loop


  // Fetch friend locations when component mounts
  useEffect(() => {
    if (isConnected && !isBackground) {
      loadFriendLocations();
    }
  }, [isConnected, isBackground]);

  // Removed redundant refresh on isConnected change to avoid duplicate fetches

  // Center map on event coordinates when provided (but don't affect timeline)
  useEffect(() => {
    if (eventCoordinates && mapRef.current && eventCoordinates.lat && eventCoordinates.lng) {
      // Only center the map view, don't trigger any timeline updates
      mapRef.current.setView([eventCoordinates.lat, eventCoordinates.lng], 15);
    }
  }, [eventCoordinates]);

  // Check if app banner should show when user came from an event page
  useEffect(() => {
    // Show banner when user came from an event page
    if (fromEvent && eventIdFromState && shouldShowAppBanner()) {
      setShowAppBanner(true);
    }
  }, [fromEvent, eventIdFromState]);

  return (
    <>
      {showAppBanner && eventIdFromState && (
        <AppRedirectBanner 
          eventId={eventIdFromState}
          onClose={() => setShowAppBanner(false)}
        />
      )}
      <Header
        toggleLeftMenu={() => setIsLeftMenuOpen(!isLeftMenuOpen)}
        toggleFilterMenu={() => setisFilterOpen(!isFilterOpen)}
        hideNavigationIcons={true}
      />
      {!isBackground && isLeftMenuOpen && <LeftMenu closeMenu={() => setIsLeftMenuOpen(false)} />}
      {!isBackground && isFilterOpen && (
        <FilterMenu
          toggleClustering={() => setIsClustered((prev) => !prev)}
          isClustered={isClustered}
          tags={tags}
          selectedTags={selectedTags}
          handleTagSelection={handleTagSelection}
          closeMenu={() => setisFilterOpen(false)}
          setSelectedLocation={setSelectedLocation}
          showFriendLocations={showFriendLocations}
          setShowFriendLocations={setShowFriendLocations}
          showProjects={showProjects}
          setShowProjects={setShowProjects}
          showEvents={showEvents}
          setShowEvents={setShowEvents}
          disableClustering={showProjects && showFriendLocations}
        />
      )}
      <Map
        isFilterOpen={!isBackground && isFilterOpen}
        isLeftMenuOpen={!isBackground && isLeftMenuOpen}
        initializeMap={initializeMap}
      >
      </Map>

      {/* Map Controls - Create Project and Date Range Picker */}
      <MapControls
        timeframe={timeframe}
        onTimeChange={handleTimelineTimeChange}
        onCreateProject={() => setShowCreateForm(true)}
        isBackground={isBackground}
      />

      {/* Create Event Form modal */}
      {!isBackground && showCreateForm && (
        <CreateEventForm
          projectId={null}
          onEventCreated={(createdEvent) => {
            setShowCreateForm(false);
            refreshMarkersForSelectedTags();
            
            // Handle spatiotemporal navigation for events created from MarkersMap
            if (createdEvent && createdEvent.lat && createdEvent.lng) {
              // Update map location to the new event
              setMapState({
                center: { lat: createdEvent.lat, lng: createdEvent.lng },
                zoom: 15
              });
              
              // Update timeframe to include the new event's dates
              if (createdEvent.start_date && createdEvent.end_date) {
                const eventStart = new Date(createdEvent.start_date);
                const eventEnd = new Date(createdEvent.end_date);
                
                // Check if event dates fall outside current timeframe
                const currentStart = new Date(timeframe.start);
                const currentEnd = new Date(timeframe.end);
                
                let newStart = currentStart;
                let newEnd = currentEnd;
                
                // Expand timeframe if event is outside current range
                if (eventStart < currentStart) {
                  newStart = new Date(eventStart);
                  newStart.setDate(newStart.getDate() - 7); // Add 1 week padding
                }
                if (eventEnd > currentEnd) {
                  newEnd = new Date(eventEnd);
                  newEnd.setDate(newEnd.getDate() + 7); // Add 1 week padding
                }
                
                // Only update if timeframe actually changed
                if (newStart.getTime() !== currentStart.getTime() || newEnd.getTime() !== currentEnd.getTime()) {
                  setContextTimeframe({
                    start: newStart,
                    end: newEnd
                  });
                }
              }
            }
          }}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </>
  );
};

export default MarkersMap;
