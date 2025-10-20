import React, { useState, useEffect, useRef, useContext } from 'react';
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
  const [isManageMode, setIsManageMode] = useState(false);
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
        setIsDatePopoverOpen(false);
      }
    };
    if (isDatePopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePopoverOpen]);

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
    if (projects.length > 0) {
      const sortedEvents = [...projects].sort((a, b) => {
        return new Date(b.start_time) - new Date(a.start_time);
      });
      setEvents(sortedEvents);
    }
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

  // Filter events based on timeline selection - this should run only when events or timeRange actually change
  useEffect(() => {
    if (!events || events.length === 0) return;

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

  const toggleManageMode = () => {
    setIsManageMode(prev => !prev);
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      // Get the event details
      const event = projects.find(e => e.id === eventId);

      if (!event) {
        console.error("Event not found for deletion");
        return;
      }

      // Backend enforces permissions automatically - only creators can delete
      const response = await deleteEvent(eventId);
      if (response) {
        setProjects(prev => prev.filter(event => event.id !== eventId));
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Unable to delete the project at this time.");
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
        <h2 className={styles.h2Project}>
         Projets
          {/* Date Range Selector */}
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
                    <button disabled={new Date(draftStart) > new Date(draftEnd)} onClick={applyDateRange}>Appliquer</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </h2>

        {/* Action buttons - stacked vertically */}
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
      </div>

      {/* Add button row – shown below the timeline filter */}
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
                onClick={() => setActiveTab('mine')}
              >
                Mes projets
              </button>
              <button
                className={`${styles.tabProject} ${activeTab === 'invited' ? styles.tabActiveProject : ''}`}
                onClick={() => setActiveTab('invited')}
              >
                Projets invités
              </button>
            </div>
          </div>
        )}
        {/* Render Your Projects */}
        <div>
          {!isMobile && <h3 className={styles.h3Project}>Mes projets</h3>}
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
                    isManageMode={isManageMode}
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
            <div className={styles.headerLeftProject}>
              <button
                onClick={toggleManageMode}
                className={`${styles.manageButtonProject} ${styles.manageButtonMobileProject} ${isManageMode ? styles.activeProject : ''}`}
                data-button-type="project-edit"
              >
                <FaEdit /> Modifier
              </button>
            </div>
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

          {getFilteredFriendsEvents().length === 0 ? (
            <p>Vous ne faites partie d'aucun projet pour le moment.</p>
          ) : (!isMobile && (
            <div className={styles.eventsGridProject}>
              {capToTwoRows(getFilteredFriendsEvents()).map((event) => {
                const shouldAutoOpen = autoOpenEventId === event.id;
                // Allow editing if event is shared AND user is in manage mode
                const canEdit = event.event_shared && isManageMode;
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    isManageMode={canEdit} // Allow editing of shared events only in manage mode
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
                      isManageMode={isManageMode}
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
              <div className={styles.eventsGridProject}>
                {getFilteredFriendsEvents().map((event) => {
                  const shouldAutoOpen = autoOpenEventId === event.id;
                  const canEdit = event.event_shared && isManageMode;
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      isManageMode={canEdit}
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
            setIsManageMode(false); // Reset manage mode when closing
          }}
          onEventUpdated={handleEventUpdated}
          setEditMode={setEditingEvent}
          setIsManageMode={setIsManageMode} // Pass the state setter function
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
