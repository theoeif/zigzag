import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { FaTrashAlt, FaCog, FaEdit, FaMapMarkerAlt, FaClock, FaWhatsapp, FaGlobe, FaUser, FaChevronUp, FaChevronDown, FaShare, FaCalendarPlus, FaBookmark, FaLink, FaUsers, FaFilter, FaPlus, FaUserFriends, FaCalendarAlt } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import Header from '../Header/Header';
import { AuthContext } from '../../contexts/AuthProvider';
import LeftMenu from '../LeftMenu/LeftMenu';
import styles from './Project.module.css';
import { fetchEvents, fetchCircles, deleteEvent, fetchCircleMembers } from '../../api/api';
import CreateEventForm from './CreateEventForm';
import EditEventForm from './EditEventForm';
import CircleMembersPopup from './CircleMembersPopup';
import EventCard from './EventCard';
import { MapContext } from '../../contexts/MapContext';

const Project = ({ projectId }) => {
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [projects, setProjects] = useState([]);           // Events created by the user
  const [otherProjects, setOtherProjects] = useState([]);   // Other events (excluding user's own)
  const [editingEvent, setEditingEvent] = useState(null);   // Track event being edited
  const [isLoading, setIsLoading] = useState(true);

  // Date range popover state
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const datePopoverRef = useRef(null);

  const [showCircleMembers, setShowCircleMembers] = useState(false);
  const [selectedCircleIDs, setSelectedCircleIDs] = useState([]);
  const [selectedCircleName, setSelectedCircleName] = useState('');
  const [filterType, setFilterType] = useState('recent'); // 'recent', 'old', 'public'
  const [anyDetailsExpanded, setAnyDetailsExpanded] = useState(false);
  const menuRef = useRef(null);
  const { isConnected } = useContext(AuthContext);
  const { mapState } = useContext(MapContext);
  const location = useLocation();
  const [autoOpenEventId, setAutoOpenEventId] = useState(location.state?.openEventId || null);

  // (logs removed)

  // State for circles (for mapping events)
  const [circles, setCircles] = useState([]);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [timeRange, setTimeRange] = useState(() => {
    // Initialize with a 3-month range
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    console.log('Project: Initial time range:', start.toISOString(), '-', end.toISOString());
    return { start, end };
  });

  // Add a state variable to track if timeRange has been modified
  const [timeRangeModified, setTimeRangeModified] = useState(false);

  // Add state for filtered friends' events
  const [filteredFriendsEvents, setFilteredFriendsEvents] = useState([]);

  // Draft date range values for the popover (YYYY-MM-DD)
  const [draftStart, setDraftStart] = useState(() => timeRange.start.toISOString().slice(0, 10));
  const [draftEnd, setDraftEnd] = useState(() => timeRange.end.toISOString().slice(0, 10));



  useEffect(() => {
    const getCircles = async () => {
      const circleData = await fetchCircles();
      setCircles(circleData || []);
    };
    getCircles();
  }, []);

  // State for showing the event creation form modal
  const [showEventForm, setShowEventForm] = useState(false);

  // Effect to disable body scroll when modal is open or details are expanded
  useEffect(() => {
    if (showEventForm || editingEvent || showCircleMembers || anyDetailsExpanded) {
      // Disable body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to ensure scroll is re-enabled when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showEventForm, editingEvent, showCircleMembers, anyDetailsExpanded]);


  // Keep draft dates in sync when timeRange changes
  useEffect(() => {
    setDraftStart(timeRange.start.toISOString().slice(0, 10));
    setDraftEnd(timeRange.end.toISOString().slice(0, 10));
  }, [timeRange.start, timeRange.end]);

  // Close date popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePopoverRef.current && !datePopoverRef.current.contains(e.target)) {
        // Apply date range automatically when closing by clicking outside
        const start = new Date(draftStart);
        const end = new Date(draftEnd);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          // Only apply if dates are valid and different from current timeRange
          const currentStart = new Date(timeRange.start);
          const currentEnd = new Date(timeRange.end);
          // Normalize dates for comparison (set hours to 0 for start, 23:59:59 for end)
          currentStart.setHours(0, 0, 0, 0);
          currentEnd.setHours(23, 59, 59, 999);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          
          const startChanged = start.getTime() !== currentStart.getTime();
          const endChanged = end.getTime() !== currentEnd.getTime();
          
          if (startChanged || endChanged) {
            // Apply the date range directly (same logic as handleTimeChange)
            setTimeRange({ start, end });
            setTimeRangeModified(true);
          }
        }
        setIsDatePopoverOpen(false);
      }
    };
    if (isDatePopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePopoverOpen, draftStart, draftEnd, timeRange]);

  // Fetch and categorize events
  useEffect(() => {
    const getEvents = async () => {
      setIsLoading(true);
      if (isConnected) {
        try {
          const data = await fetchEvents();
          if (data) {
            // Expecting shape: { events_user: [...], events_invited: [...] }
            const userEvents = Array.isArray(data.events_user) ? data.events_user : [];
            const invitedEvents = Array.isArray(data.events_invited) ? data.events_invited : [];

            const sortedUser = [...userEvents].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
            const sortedInvited = [...invitedEvents].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

            setProjects(sortedUser);
            setOtherProjects(sortedInvited);
            setFilteredFriendsEvents(sortedInvited);
            setEvents(sortedUser);
          }
        } catch (error) {
          console.error("Error fetching events:", error);
        }
      }
      // Shorter loading time
      setTimeout(() => setIsLoading(false), 50);
    };
    getEvents();
  }, [isConnected]);

  // New useEffect: Update events state whenever projects state changes (for immediate UI updates after edits)
  useEffect(() => {
    const sortedEvents = [...projects].sort((a, b) => {
      return new Date(b.start_time) - new Date(a.start_time);
    });
    setEvents(sortedEvents);
  }, [projects]);

  // Viewport tracking to derive mobile status and grid columns
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = viewportWidth <= 500;
  const numColumns = viewportWidth >= 1024 ? 3 : viewportWidth >= 500 ? 2 : 1;
  const capToTwoRows = (arr) => (isMobile ? arr : arr.slice(0, numColumns * 2));

  // Mobile tabs state (ignored on web where both sections are shown)
  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'invited'

  // Optimized tab click handlers to prevent unnecessary re-renders
  const handleTabMine = useCallback(() => {
    if (activeTab !== 'mine') {
      setActiveTab('mine');
    }
  }, [activeTab]);

  const handleTabInvited = useCallback(() => {
    if (activeTab !== 'invited') {
      setActiveTab('invited');
    }
  }, [activeTab]);

  // Filter events based on timeline selection - this should run only when events or timeRange actually change
  useEffect(() => {
    // Handle empty events array
    if (!events || events.length === 0) {
      setFilteredEvents([]);
      return;
    }

    // Clone dates to avoid modifying original values
    const rawStart = new Date(timeRange.start);
    const rawEnd = new Date(timeRange.end);

    // Normalize dates to cover full days
    const start = new Date(rawStart);
    start.setHours(0, 0, 0, 0);  // Set to 00:00:00

    const end = new Date(rawEnd);
    end.setHours(23, 59, 59, 999);  // Set to 23:59:59.999

    const filterEventByTimeframe = (event) => {
      const eventStart = new Date(event.start_time);
      // If end_time is null, use start_time as end_time (single-day event)
      const eventEnd = event.end_time ? new Date(event.end_time) : new Date(event.start_time);

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

    const filtered = events.filter(filterEventByTimeframe);
    setFilteredEvents(filtered);

    // Also filter friends' events based on the same criteria
    if (otherProjects && otherProjects.length > 0) {
      const filteredFriends = otherProjects.filter(filterEventByTimeframe);
      setFilteredFriendsEvents(filteredFriends);
    } else {
      setFilteredFriendsEvents([]);
    }
  }, [events, otherProjects, timeRange.start, timeRange.end]);

  // Update the handleTimeChange function to mark when the user has modified the range
  const handleTimeChange = ({ start, end }) => {
    // console.log('Project: handleTimeChange called with:',
    //   start.toISOString(), '-', end.toISOString());

    // Compare if dates are actually different to avoid unnecessary updates
    const currentStart = timeRange.start.getTime();
    const currentEnd = timeRange.end.getTime();
    const newStart = start.getTime();
    const newEnd = end.getTime();

    if (currentStart !== newStart || currentEnd !== newEnd) {
      // console.log('Project: Updating time range from TimelineBar');
      setTimeRange({ start, end });
      setTimeRangeModified(true); // Mark that user has modified the time range
    }
  };

  // Helper to map circle IDs to names
  const getCircleNames = (eventCircles) => {
    if (!eventCircles || !circles.length) return "No circles";
    return eventCircles
      .map(circleId => circles.find(circle => circle.id === circleId)?.name)
      .filter(Boolean)
      .join(", ");
  };

  // Helper to format date nicely
  const formatDateIntl = (dateString) => {
    const date = new Date(dateString);
    const dayPart = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);
    const timePart = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
    return `${dayPart} ${timePart}`;
  };

  // Handling outside clicks to close the left menu - animation removed
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInsideLeftMenu = e.target.closest(".left-menu") || e.target.closest(".left-menu-icon");
      if (!isClickInsideLeftMenu) {
        setIsLeftMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isLeftMenuOpen]);

  const toggleLeftMenu = () => {
    setIsLeftMenuOpen(prev => !prev);
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      // Get the event details
      const event = projects.find(e => e.id === eventId);

      if (!event) {
        console.error("Event not found for deletion");
        return;
      }

      // Show confirmation dialog in French
      const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?");
      
      if (!confirmed) {
        return;
      }

      // OPTIMISTIC UPDATE: Remove from all states immediately for instant UI feedback
      setProjects(prev => prev.filter(e => e.id !== eventId));
      setOtherProjects(prev => prev.filter(e => e.id !== eventId));
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setFilteredEvents(prev => prev.filter(e => e.id !== eventId));
      setFilteredFriendsEvents(prev => prev.filter(e => e.id !== eventId));

      // Make API call in background
      const response = await deleteEvent(eventId);
      
      // If deletion failed on backend, show error but don't revert (user has already seen it disappear)
      if (!response) {
        console.error("Failed to delete event on backend");
        alert("L'événement n'a pas pu être supprimé du serveur. Veuillez rafraîchir la page.");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Erreur lors de la suppression. Veuillez rafraîchir la page.");
    }
  };

  const handleEditEvent = (event) => {
    // Backend enforces permissions automatically - creators and circle members of shared events can edit
    setEditingEvent(event);  // Open Edit Modal with event data
  };

  const handleEventUpdated = (updatedEvent) => {
    // Update in user's events
    setProjects(prev => prev.map(event => (event.id === updatedEvent.id ? updatedEvent : event)));

    // Also update in other projects (invited events) if it's there
    setOtherProjects(prev => prev.map(event => (event.id === updatedEvent.id ? updatedEvent : event)));

    setEditingEvent(null);  // Close modal after updating
  };

  // Filter friends' events based on selected filter
  const getFilteredFriendsEvents = () => {
    switch(filterType) {
      case 'old':
        return [...filteredFriendsEvents].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      case 'recent':
      default:
        return filteredFriendsEvents;
    }
  };



  const handleViewCircleMembers = (circleIdsOrId, circleName) => {
    // Check if we received a single ID or an array
    const circleIds = Array.isArray(circleIdsOrId) ? circleIdsOrId : [circleIdsOrId];

    if (!circleIds.length) {
      return;
    }

    // Set the circle IDs to display
    setSelectedCircleIDs(circleIds);

    // Use the passed title directly without adding redundant text
    setSelectedCircleName(circleName || 'Project Participants');

    setShowCircleMembers(true);
  };

  const applyDateRange = () => {
    const start = new Date(draftStart);
    const end = new Date(draftEnd);
    if (isNaN(start) || isNaN(end) || start > end) return;
    if (typeof handleTimeChange === 'function') {
      handleTimeChange({ start, end });
    } else {
      // Fallback if handleTimeChange is unavailable
      setTimeRange({ start, end });
      setTimeRangeModified(true);
    }
    setIsDatePopoverOpen(false);
  };

  const resetRange = () => {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    if (typeof handleTimeChange === 'function') {
      handleTimeChange({ start, end });
    } else {
      setTimeRange({ start, end });
      setTimeRangeModified(true);
    }
    setIsDatePopoverOpen(false);
  };

  // Function to handle details expansion in event cards
  const handleDetailsToggle = (isExpanded) => {
    setAnyDetailsExpanded(isExpanded);
  };

  // Reset details expansion state when events change
  useEffect(() => {
    setAnyDetailsExpanded(false);
  }, [filteredEvents, filteredFriendsEvents]);

  // Align address heights within each row on desktop
  useEffect(() => {
    // Only run on desktop (screen width > 500px)
    if (viewportWidth <= 500) return;

    const alignAddressHeights = () => {
      // Find all grid containers - use class name directly since CSS modules might hash it
      const grids = document.querySelectorAll('[class*="eventsGridProject"]');
      
      grids.forEach((grid) => {
        // Get all cards in this grid
        const cards = Array.from(grid.children);
        if (cards.length === 0) return;

        // Determine number of columns (3 on desktop, 2 on tablet)
        const gridComputedStyle = window.getComputedStyle(grid);
        const gridTemplateColumns = gridComputedStyle.gridTemplateColumns;
        const numColumns = gridTemplateColumns.split(' ').length;

        // Group cards by row
        const rows = [];
        for (let i = 0; i < cards.length; i += numColumns) {
          rows.push(cards.slice(i, i + numColumns));
        }

        // For each row, align addresses by their top position relative to the card
        // Also account for "PARTAGÉ" badge spacing
        rows.forEach((rowCards) => {
          // Find badge elements, address elements, and description elements for each card
          const cardData = rowCards.map(card => {
            // Find badge
            const badge = card.querySelector(`.${styles.sharedEventBadgeProject}`) ||
                         card.querySelector('[class*="sharedEventBadgeProject"]') ||
                         card.querySelector('.sharedEventBadgeProject');
            
            // Find address
            const address = card.querySelector(`.${styles.eventLocationProject}`) ||
                           card.querySelector('[class*="eventLocationProject"]') ||
                           card.querySelector('.eventLocationProject');
            
            // Find description (if present)
            const description = card.querySelector(`.${styles.descriptionPreviewProject}`) ||
                              card.querySelector('[class*="descriptionPreviewProject"]') ||
                              card.querySelector('.descriptionPreviewProject');
            
            return { card, badge, address, description };
          }).filter(data => data.address); // Only keep cards with addresses

          if (cardData.length === 0) return;

          // Check if any card in the row has a badge
          const hasBadgeInRow = cardData.some(data => data.badge !== null);
          
          // If there's a badge in the row, calculate its height including gap
          let badgeHeight = 0;
          if (hasBadgeInRow) {
            const badgeCard = cardData.find(data => data.badge);
            if (badgeCard && badgeCard.badge) {
              const badgeRect = badgeCard.badge.getBoundingClientRect();
              // Get the title container to check gap
              const titleContainer = badgeCard.badge.closest(`.${styles.titleContainerProject}`) ||
                                    badgeCard.badge.closest('[class*="titleContainerProject"]') ||
                                    badgeCard.badge.parentElement;
              if (titleContainer) {
                const containerStyle = window.getComputedStyle(titleContainer);
                const gap = parseFloat(containerStyle.gap) || 6; // Default gap from CSS
                badgeHeight = badgeRect.height + gap;
              } else {
                badgeHeight = badgeRect.height + 6; // Fallback gap
              }
            }
          }

          // Reset heights and margins to auto to get natural measurements
          cardData.forEach(({ address }) => {
            address.style.setProperty('height', 'auto', 'important');
            address.style.setProperty('margin-top', 'auto', 'important');
            address.style.setProperty('margin-bottom', 'auto', 'important');
          });

          // Force a reflow to get accurate measurements
          void grid.offsetHeight;

          // First, add virtual space to cards without badges (if any card in row has badge)
          // This creates the same spacing as if the badge were present
          cardData.forEach(({ badge, address }) => {
            if (hasBadgeInRow && !badge) {
              address.style.setProperty('margin-top', `${badgeHeight}px`, 'important');
            }
          });

          // Force another reflow after adding virtual space
          void grid.offsetHeight;

          // Calculate top positions of addresses relative to title container bottom
          // This ensures addresses align at the same level regardless of description presence
          const addressPositions = cardData.map(({ card, address }) => {
            // Find title container
            const titleContainer = card.querySelector(`.${styles.titleContainerProject}`) ||
                                 card.querySelector('[class*="titleContainerProject"]') ||
                                 card.querySelector('.titleContainerProject');
            
            if (titleContainer) {
              const titleRect = titleContainer.getBoundingClientRect();
              const addressRect = address.getBoundingClientRect();
              return {
                card,
                address,
                titleContainer,
                topOffset: addressRect.top - titleRect.bottom
              };
            } else {
              // Fallback to card-relative positioning if title container not found
              const cardRect = card.getBoundingClientRect();
              const addressRect = address.getBoundingClientRect();
              return {
                card,
                address,
                titleContainer: null,
                topOffset: addressRect.top - cardRect.top
              };
            }
          });

          // Find the minimum top offset (the highest address position relative to title)
          const minTopOffset = Math.min(...addressPositions.map(p => p.topOffset));

          // Find the maximum height for addresses
          const heights = cardData.map(({ address }) => address.getBoundingClientRect().height);
          const maxHeight = Math.max(...heights);

          // Align all addresses to the same top position and set to max height
          addressPositions.forEach(({ card, address, topOffset }, index) => {
            const cardDataItem = cardData[index];
            const { badge, description } = cardDataItem;
            
            // Get current margin-top (which may include virtual badge space)
            const currentMarginTop = parseFloat(address.style.marginTop) || 0;
            
            // Calculate the additional margin-top needed to align to the minimum top position
            const additionalMarginNeeded = minTopOffset - topOffset;
            
            // Set the address height to max height
            address.style.setProperty('height', `${maxHeight}px`, 'important');
            
            // Adjust margin-top: keep virtual badge space + add alignment adjustment
            const finalMarginTop = currentMarginTop + (additionalMarginNeeded > 0 ? additionalMarginNeeded : 0);
            address.style.setProperty('margin-top', `${finalMarginTop}px`, 'important');
            
            // Ensure consistent margin-bottom (address already has 8px in CSS, keep it)
            address.style.setProperty('margin-bottom', '8px', 'important');
          });
        });
      });
    };

    // Run after a short delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(alignAddressHeights, 200);

    // Also run on window resize with debounce
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(alignAddressHeights, 200);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [filteredEvents, filteredFriendsEvents, viewportWidth, styles]);

  // (logs removed)

  // Loading state UI
  if (isLoading) {
    return (
      <div className={styles.profilePageProject}>
        <Header toggleLeftMenu={toggleLeftMenu} />
        <div className={styles.loadingContainerProject}>
          <div className={styles.loadingSpinnerProject}></div>
          <p>Chargement des projets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profilePageProject}>
      {/* Header */}
      <Header toggleLeftMenu={toggleLeftMenu} />

      {/* Left Menu - with unique class name */}
      {isLeftMenuOpen && (
        <div
          ref={menuRef}
          className="left-menu project-page-left-menu"
        >
          <LeftMenu
            closeMenu={() => setIsLeftMenuOpen(false)}
          />
        </div>
      )}

      {/* Main content section with proper spacing */}
      <div className={styles.mainContentSectionProject}>
        {!isMobile && (
          <h2 className={styles.h2Project}>
            Projets
            {!editingEvent && (
              <div className={styles.dateRangeBarProject} ref={datePopoverRef}>
                <button
                  className={styles.dateRangeButtonProject}
                  onClick={() => setIsDatePopoverOpen(v => !v)}
                >
                  {`${draftStart} → ${draftEnd}`}
                </button>
                {isDatePopoverOpen && (
                  <div className={styles.dateRangePopoverProject}>
                    <label>
                      Début
                      <input type="date" value={draftStart} max={draftEnd} onChange={e => setDraftStart(e.target.value)} />
                    </label>
                    <label>
                      Fin
                      <input type="date" value={draftEnd} min={draftStart} onChange={e => setDraftEnd(e.target.value)} />
                    </label>
                    <div className={styles.dateRangeActionsProject}>
                      <button onClick={resetRange}>Réinitialiser</button>
                      <button className={styles.applyButtonProject} disabled={new Date(draftStart) > new Date(draftEnd)} onClick={applyDateRange}>Appliquer</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </h2>
        )}

        {isMobile && (
          <div className={styles.mobileHeaderProject}>
            {!editingEvent && (
              <div className={styles.dateRangeMobileWrapProject} ref={datePopoverRef}>
                <button
                  className={styles.dateRangeButtonProject}
                  onClick={() => setIsDatePopoverOpen(v => !v)}
                >
                  {`${draftStart} → ${draftEnd}`}
                </button>
                {isDatePopoverOpen && (
                  <div className={styles.dateRangePopoverProject}>
                    <label>
                      Début
                      <input type="date" value={draftStart} max={draftEnd} onChange={e => setDraftStart(e.target.value)} />
                    </label>
                    <label>
                      Fin
                      <input type="date" value={draftEnd} min={draftStart} onChange={e => setDraftEnd(e.target.value)} />
                    </label>
                    <div className={styles.dateRangeActionsProject}>
                      <button onClick={resetRange}>Réinitialiser</button>
                      <button className={styles.applyButtonProject} disabled={new Date(draftStart) > new Date(draftEnd)} onClick={applyDateRange}>Appliquer</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Tabs removed from mobile header per request */}
          </div>
        )}

        {/* Action buttons - stacked vertically */}
        {!editingEvent && !isLeftMenuOpen && (
          <div className={styles.actionButtonsContainerProject}>
            <button
              onClick={() => {
                setShowEventForm(true);
              }}
              className={styles.addEventButtonProject}
              data-button-type="project-add"
            >
              <FaPlus /> Ajouter un projet
            </button>
          </div>
        )}
      </div>

      {/* Add button row – shown below the timeline filter */}
      {!editingEvent && !isLeftMenuOpen && (
        <div className={styles.addButtonRowProject}>
          <button
            onClick={() => {
              setShowEventForm(true);
            }}
            className={styles.addEventButtonProject}
            data-button-type="project-add"
          >
            <FaPlus />
          </button>
        </div>
      )}

      {/* Render the Create Event Form Modal */}
      {showEventForm && (
        <CreateEventForm
          onClose={() => {
            setShowEventForm(false);
          }}
          onEventCreated={(newEvent) => {
            console.log("New event created:", newEvent);
            // Update projects state with the new event to ensure it's displayed immediately
            setProjects(prev => [newEvent, ...prev]);
          }}
          circles={circles}
        />
      )}

      {/* Content with padding to avoid TimelineBar overlap */}
      <div className={styles.contentWithPaddingProject}>
        {/* Mobile tabs bar */}
        {isMobile && (
          <div className={styles.tabsBarProject}>
            <div className={styles.tabsGroupProject}>
              <button
                className={`${styles.tabProject} ${activeTab === 'mine' ? styles.tabActiveProject : ''}`}
                onClick={handleTabMine}
              >
                Mes projets
              </button>
              <button
                className={`${styles.tabProject} ${activeTab === 'invited' ? styles.tabActiveProject : ''}`}
                onClick={handleTabInvited}
              >
                Projets invités
              </button>
            </div>
          </div>
        )}
        {/* Render Your Projects */}
        <div>
          {!isMobile && (
            <div className={styles.sectionHeaderProject}>
              <h3 className={styles.h3Project}>Mes projets</h3>
            </div>
          )}
          {(isMobile ? filteredEvents : capToTwoRows(filteredEvents)).length === 0 ? (
            <p>Vous n'avez pas encore créé de projets.</p>
          ) : (!isMobile && (
            <div className={styles.eventsGridProject}>
              {capToTwoRows(filteredEvents).map((event) => {
                const shouldAutoOpen = autoOpenEventId === event.id;
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    isManageMode={true}
                    showDelete={true}
                    onDelete={handleDeleteEvent}
                    onEdit={handleEditEvent}
                    onViewCircleMembers={handleViewCircleMembers}
                    onDetailsToggle={handleDetailsToggle}
                    autoOpen={shouldAutoOpen}
                    onAutoOpened={() => setAutoOpenEventId(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className={styles.dividerProject}></div>

        {/* Friends Events with Filter */}
        <div>
          <div className={styles.sectionHeaderProject}>
            {!isMobile && <h3 className={styles.h3Project}>Projets invités</h3>}
            <div className={styles.headerRightProject}>
              <div className={styles.filterContainerProject}>
                <FaFilter />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={styles.filterSelectProject}
                >
                  <option value="recent">Plus récents</option>
                  <option value="old">Plus anciens</option>
                </select>
              </div>
            </div>
          </div>

          {!isMobile && getFilteredFriendsEvents().length === 0 ? (
            <p>Vous ne faites partie d'aucun projet pour le moment.</p>
          ) : (!isMobile && (
            <div className={styles.eventsGridProject}>
              {capToTwoRows(getFilteredFriendsEvents()).map((event) => {
                const shouldAutoOpen = autoOpenEventId === event.id;
                // Allow editing if event is shared
                const canEdit = event.event_shared;
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    isManageMode={canEdit}
                    showDelete={false}
                    onDelete={handleDeleteEvent}
                    onEdit={handleEditEvent}
                    onViewCircleMembers={handleViewCircleMembers}
                    onDetailsToggle={handleDetailsToggle}
                    autoOpen={shouldAutoOpen}
                    onAutoOpened={() => setAutoOpenEventId(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Mobile conditional content rendering */}
        {isMobile && (
          <div>
            {activeTab === 'mine' ? (
              <div className={styles.eventsGridProject}>
                {filteredEvents.map((event) => {
                  const shouldAutoOpen = autoOpenEventId === event.id;
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      isManageMode={true}
                      showDelete={true}
                      onDelete={handleDeleteEvent}
                      onEdit={handleEditEvent}
                      onViewCircleMembers={handleViewCircleMembers}
                      onDetailsToggle={handleDetailsToggle}
                      autoOpen={shouldAutoOpen}
                      onAutoOpened={() => setAutoOpenEventId(null)}
                    />
                  );
                })}
              </div>
            ) : (
              <>
                {getFilteredFriendsEvents().length === 0 ? (
                  <p>Vous ne faites partie d'aucun projet pour le moment.</p>
                ) : (
                  <div className={styles.eventsGridProject}>
                    {getFilteredFriendsEvents().map((event) => {
                      const shouldAutoOpen = autoOpenEventId === event.id;
                      const canEdit = event.event_shared;
                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          isManageMode={canEdit}
                          showDelete={false}
                          onDelete={handleDeleteEvent}
                          onEdit={handleEditEvent}
                          onViewCircleMembers={handleViewCircleMembers}
                          onDetailsToggle={handleDetailsToggle}
                          autoOpen={shouldAutoOpen}
                          onAutoOpened={() => setAutoOpenEventId(null)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}


      </div>

      {/* Edit Form Modal */}
      {editingEvent && (
        <EditEventForm
          eventData={editingEvent}
          isCreator={projects.some(e => e.id === editingEvent.id)}
          onClose={() => {
            setEditingEvent(null);
          }}
          onEventUpdated={handleEventUpdated}
          setEditMode={setEditingEvent}
        />
      )}

      {/* Circle Members Popup */}
      {showCircleMembers && (
          <CircleMembersPopup
          circleIds={selectedCircleIDs}
          circleName={selectedCircleName}
          onClose={() => {
            setShowCircleMembers(false);
          }}
        />
      )}
    </div>
  );
};

export default Project;
