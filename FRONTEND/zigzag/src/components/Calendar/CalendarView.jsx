import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Button, Box, IconButton, Tooltip, Modal, Typography, Chip, Stack, Menu, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { CalendarToday, Download, Close, Info, ArrowDropDown } from '@mui/icons-material';
import { fetchEvents, createEvent, patchEvent, deleteEvent, downloadICalFile } from '../../api/api';
import CreateEventForm from '../Project/CreateEventForm';
import EditEventForm from '../Project/EditEventForm';
import EventView from '../EventViewMap/EventView/EventView';
import EventDetailsSection from '../Project/EventDetailsSection';
import CircleMembersPopup from '../Project/CircleMembersPopup';
import CircleSelector from './CircleSelector';
import LeftMenu from '../LeftMenu/LeftMenu';
import styles from './CalendarView.module.css';
import Header from '../Header/Header';

const CalendarView = () => {
    const calendarRef = useRef(null);

  // State management
  const [events, setEvents] = useState([]);
  const [greyEvents, setGreyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEventView, setShowEventView] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filteredCircles, setFilteredCircles] = useState([]);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showCircleMembers, setShowCircleMembers] = useState(false);
  const [circleMembersData, setCircleMembersData] = useState(null);
  const [listMonths, setListMonths] = useState(1);
  const [activeView, setActiveView] = useState('dayGridMonth');
  const [calendarMode, setCalendarMode] = useState('my'); // 'my' or 'circle'
  const [selectedCircles, setSelectedCircles] = useState([]);
  const [circleError, setCircleError] = useState(null);
  const [showCircleSelector, setShowCircleSelector] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [viewMenuAnchor, setViewMenuAnchor] = useState(null);
  const [selectedView, setSelectedView] = useState('myList');
  const [listAnchorDate, setListAnchorDate] = useState(new Date());
  const [mobileTitle, setMobileTitle] = useState(() => {
    // Set initial title for list view (1 month by default)
    const now = new Date();
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    return `${month} ${year}`;
  });
  const [webTitle, setWebTitle] = useState(() => {
    const now = new Date();
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    return `${month} ${year}`;
  });

  // Fetch events on component mount.
  useEffect(() => {
    loadEvents();
  }, []);

  // Check if mobile and handle resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && showCircleSelector) {
        const sidebar = document.querySelector('[data-circle-selector]');

        if (sidebar && !sidebar.contains(event.target)) {
          setShowCircleSelector(false);
        }
      }
    };

    if (isMobile && showCircleSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobile, showCircleSelector]);

  // Handle click outside to close left menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInside = event.target.closest(".left-menu") || event.target.closest(".left-menu-icon");
      if (!isClickInside) setIsLeftMenuOpen(false);
    };

    if (isLeftMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isLeftMenuOpen]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsData = await fetchEvents();
      if (eventsData) {
        // Handle the new events format - concatenate events_user and events_invited
        const allEvents = [
          ...(eventsData.events_user || []),
          ...(eventsData.events_invited || [])
        ];

        // Transform events to FullCalendar format
        const calendarEvents = allEvents.map(event => {
          const startDate = new Date(event.start_time);
          const startHour = startDate.getHours();
          const isWithinWindow = startHour >= 13 && startHour < 22; // show in timed grid between 13:00 and 22:00

          const color = getEventColor(event.circles);

          if (isWithinWindow) {
            const displayEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
            return {
              id: event.id,
              title: event.title,
              start: startDate.toISOString(),
              end: displayEnd.toISOString(),
              allDay: false,
              extendedProps: {
                description: event.description,
                address: event.address,
                circles: event.circles,
                creator: event.creator,
                shareable_link: event.shareable_link,
                public_link: event.public_link || null,
                originalStart: event.start_time || null,
                originalEnd: event.end_time || null
              },
              backgroundColor: color,
              borderColor: color,
              textColor: '#ffffff'
            };
          }

          // Outside 13:00–22:00 → show as all-day on that date
          const dateOnly = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
          return {
            id: event.id,
            title: event.title,
            start: dateOnly,
            allDay: true,
            extendedProps: {
              description: event.description,
              address: event.address,
              circles: event.circles,
              creator: event.creator,
              shareable_link: event.shareable_link,
              public_link: event.public_link || null,
              originalStart: event.start_time || null,
              originalEnd: event.end_time || null
            },
            backgroundColor: color,
            borderColor: color,
            textColor: '#ffffff'
          };
        });

        setEvents(calendarEvents);
        setFilteredCircles(extractUniqueCircles(allEvents));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (circles) => {
    if (!circles || circles.length === 0) return '#40916c';
    // Use circle ID to generate consistent colors
    const colors = ['#40916c', '#2d6a4f', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7'];
    return colors[circles[0].id % colors.length];
  };

  const extractUniqueCircles = (eventsData) => {
    const circles = new Map();
    eventsData.forEach(event => {
      if (event.circles) {
        event.circles.forEach(circle => {
          circles.set(circle.id, circle);
        });
      }
    });
    return Array.from(circles.values());
  };

  const getMonthAlignedRange = (anchorDate, monthCount) => {
    // Use listAnchorDate for stable list view ranges
    const base = new Date(listAnchorDate);
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + monthCount, 1);
    return { start, end };
  };

  const updateWebTitle = (date, months) => {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const startMonth = monthNames[date.getMonth()];
    const startYear = date.getFullYear();
    const endDate = new Date(date);
    endDate.setMonth(endDate.getMonth() + months - 1);
    const endMonth = monthNames[endDate.getMonth()];
    const endYear = endDate.getFullYear();
    
    if (months === 1) {
      setWebTitle(`${startMonth} ${startYear}`);
    } else if (startYear === endYear) {
      setWebTitle(`${startMonth} - ${endMonth} ${startYear}`);
    } else {
      setWebTitle(`${startMonth} ${startYear} - ${endMonth} ${endYear}`);
    }
  };


  const handleChangeListMonths = (months) => {
    setListMonths(months);
    const newAnchor = new Date();
    setListAnchorDate(newAnchor); // Reset to current month
    
    // Update mobile title for new period
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const startMonth = monthNames[newAnchor.getMonth()];
    const startYear = newAnchor.getFullYear();
    const endDate = new Date(newAnchor);
    endDate.setMonth(endDate.getMonth() + months - 1);
    const endMonth = monthNames[endDate.getMonth()];
    const endYear = endDate.getFullYear();
    
    if (months === 1) {
      setMobileTitle(`${startMonth} ${startYear}`);
      setWebTitle(`${startMonth} ${startYear}`);
    } else if (startYear === endYear) {
      setMobileTitle(`${startMonth} - ${endMonth} ${startYear}`);
      setWebTitle(`${startMonth} - ${endMonth} ${startYear}`);
    } else {
      setMobileTitle(`${startMonth} ${startYear} - ${endMonth} ${endYear}`);
      setWebTitle(`${startMonth} ${startYear} - ${endMonth} ${endYear}`);
    }
    
    const api = calendarRef.current?.getApi?.();
    if (api) {
      api.changeView('myList');
      api.gotoDate(newAnchor);
    }
  };

  // Event handlers
  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
    setShowCreateForm(true);
  };

  const handleEventClick = (info) => {
    // Deactivate redirection to map viewing event; only open local view/modal
    setSelectedEvent(info.event);
    setShowEventView(true);
  };

  const handleEventDrop = async (info) => {
    try {
      const eventId = info.event.id;
      const newStart = info.event.start;
      const newEnd = info.event.end;

      await patchEvent(eventId, {
        start_time: newStart.toISOString(),
        end_time: newEnd ? newEnd.toISOString() : null
      });

      // Refresh events
      loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      // Revert the change
      info.revert();
    }
  };

  const handleEventResize = async (info) => {
    try {
      const eventId = info.event.id;
      const newStart = info.event.start;
      const newEnd = info.event.end;

      await patchEvent(eventId, {
        start_time: newStart.toISOString(),
        end_time: newEnd ? newEnd.toISOString() : null
      });

      // Refresh events
      loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      // Revert the change
      info.revert();
    }
  };

  const handleEventCreated = (newEvent) => {
    setShowCreateForm(false);
    if (calendarMode === 'my') {
      loadEvents(); // Refresh personal calendar
    }
    // In circle mode, we don't need to refresh grey events since they're read-only
  };

  const handleEventUpdated = (updatedEvent) => {
    setShowEditForm(false);
    setShowEventView(false);
    if (calendarMode === 'my') {
      loadEvents(); // Refresh personal calendar
    }
  };

  const handleEventDeleted = () => {
    setShowEventView(false);
    if (calendarMode === 'my') {
      loadEvents(); // Refresh personal calendar
    }
  };

  const handleViewCircleMembers = (circleId, circleName) => {
    setCircleMembersData({ circleId, circleName });
    setShowCircleMembers(true);
  };

  // Handle calendar mode toggle
  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setCalendarMode(newMode);
      if (newMode === 'my') {
        setGreyEvents([]);
        setSelectedCircles([]);
        setCircleError(null);
        setShowCircleSelector(false);
      } else {
        if (isMobile) {
          setShowCircleSelector(true);
        }
      }
    }
  };

  // Handle circle selection changes
  const handleCirclesChange = (newSelectedCircles) => {
    setSelectedCircles(newSelectedCircles);
  };

  // Handle grey events changes
  const handleGreyEventsChange = (newGreyEvents) => {
    setGreyEvents(newGreyEvents);
  };

  // Handle circle errors
  const handleCircleError = (error) => {
    setCircleError(error);
  };

  // Handle view menu
  const handleViewMenuOpen = (event) => {
    setViewMenuAnchor(event.currentTarget);
  };

  const handleViewMenuClose = () => {
    setViewMenuAnchor(null);
  };

  const handleMobileNavPrev = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    
    if (activeView === 'myList') {
      // Navigate backward by the list period
      const newDate = new Date(listAnchorDate);
      newDate.setMonth(newDate.getMonth() - listMonths);
      setListAnchorDate(newDate);
      api.gotoDate(newDate);
      
      // Update mobile title for list view
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                         'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const startMonth = monthNames[newDate.getMonth()];
      const startYear = newDate.getFullYear();
      const endDate = new Date(newDate);
      endDate.setMonth(endDate.getMonth() + listMonths - 1);
      const endMonth = monthNames[endDate.getMonth()];
      const endYear = endDate.getFullYear();
      
      if (listMonths === 1) {
        setMobileTitle(`${startMonth} ${startYear}`);
      } else if (startYear === endYear) {
        setMobileTitle(`${startMonth} - ${endMonth} ${startYear}`);
      } else {
        setMobileTitle(`${startMonth} ${startYear} - ${endMonth} ${endYear}`);
      }
    } else {
      api.prev();
      // Title will be updated by datesSet callback
    }
  };

  const handleMobileNavNext = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    
    if (activeView === 'myList') {
      // Navigate forward by the list period
      const newDate = new Date(listAnchorDate);
      newDate.setMonth(newDate.getMonth() + listMonths);
      setListAnchorDate(newDate);
      api.gotoDate(newDate);
      
      // Update mobile title for list view
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                         'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const startMonth = monthNames[newDate.getMonth()];
      const startYear = newDate.getFullYear();
      const endDate = new Date(newDate);
      endDate.setMonth(endDate.getMonth() + listMonths - 1);
      const endMonth = monthNames[endDate.getMonth()];
      const endYear = endDate.getFullYear();
      
      if (listMonths === 1) {
        setMobileTitle(`${startMonth} ${startYear}`);
      } else if (startYear === endYear) {
        setMobileTitle(`${startMonth} - ${endMonth} ${startYear}`);
      } else {
        setMobileTitle(`${startMonth} ${startYear} - ${endMonth} ${endYear}`);
      }
    } else {
      api.next();
      // Title will be updated by datesSet callback
    }
  };

  const handleWebNavPrev = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    
    if (activeView === 'myList') {
      const newDate = new Date(listAnchorDate);
      newDate.setMonth(newDate.getMonth() - listMonths);
      setListAnchorDate(newDate);
      api.gotoDate(newDate);
      updateWebTitle(newDate, listMonths);
    } else {
      api.prev();
    }
  };

  const handleWebNavNext = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    
    if (activeView === 'myList') {
      const newDate = new Date(listAnchorDate);
      newDate.setMonth(newDate.getMonth() + listMonths);
      setListAnchorDate(newDate);
      api.gotoDate(newDate);
      updateWebTitle(newDate, listMonths);
    } else {
      api.next();
    }
  };

  const handleTodayClick = () => {
    const api = calendarRef.current?.getApi?.();
    if (api) api.today();
  };


  const handleViewChange = (viewType) => {
    setSelectedView(viewType);
    if (viewType === 'myList') {
      const newAnchor = new Date();
      setListAnchorDate(newAnchor); // Reset to current month
      
      // Set initial mobile title for list view
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                         'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const startMonth = monthNames[newAnchor.getMonth()];
      const startYear = newAnchor.getFullYear();
      const endDate = new Date(newAnchor);
      endDate.setMonth(endDate.getMonth() + listMonths - 1);
      const endMonth = monthNames[endDate.getMonth()];
      const endYear = endDate.getFullYear();
      
      if (listMonths === 1) {
        setMobileTitle(`${startMonth} ${startYear}`);
        setWebTitle(`${startMonth} ${startYear}`);
      } else if (startYear === endYear) {
        setMobileTitle(`${startMonth} - ${endMonth} ${startYear}`);
        setWebTitle(`${startMonth} - ${endMonth} ${startYear}`);
      } else {
        setMobileTitle(`${startMonth} ${startYear} - ${endMonth} ${endYear}`);
        setWebTitle(`${startMonth} ${startYear} - ${endMonth} ${endYear}`);
      }
    }
    const api = calendarRef.current?.getApi?.();
    if (api) {
      if (viewType === 'myList') {
        api.changeView('myList');
        api.gotoDate(new Date());
      } else {
        api.changeView(viewType);
      }
    }
    handleViewMenuClose();
  };

  // Convert grey events to FullCalendar format
  const convertGreyEventsToCalendar = (greyEventsData) => {
    if (!greyEventsData || greyEventsData.length === 0) return [];

    // Group events by 30-minute time slots to reduce clutter while maintaining time accuracy
    const eventsByTimeSlot = {};
    greyEventsData.forEach(event => {
      const startDate = new Date(event.start_time);
      const endDate = event.end_time ? new Date(event.end_time) : new Date(startDate.getTime() + 60 * 60 * 1000);

      // Create a 30-minute time slot key for better grouping
      const hour = startDate.getHours();
      const minute = startDate.getMinutes();
      const slotMinute = minute < 30 ? '00' : '30';
      const timeSlotKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}-${String(hour).padStart(2, '0')}-${slotMinute}`;

      if (!eventsByTimeSlot[timeSlotKey]) {
        eventsByTimeSlot[timeSlotKey] = [];
      }
      eventsByTimeSlot[timeSlotKey].push(event);
    });

    // Create calendar events for each time slot with event count
    return Object.entries(eventsByTimeSlot).map(([timeSlotKey, events]) => {
      const firstEvent = events[0];
      const startDate = new Date(firstEvent.start_time);

      // Use the actual start time but round to the nearest 30-minute slot for display
      const displayStart = new Date(startDate);
      const minutes = displayStart.getMinutes();
      displayStart.setMinutes(minutes < 30 ? 0 : 30, 0, 0);

      // Create a 30-minute duration for the display event
      const displayEnd = new Date(displayStart.getTime() + 30 * 60 * 1000);

      return {
        id: `grey-${timeSlotKey}`,
        title: `${events.length} event${events.length > 1 ? 's' : ''}`,
        start: displayStart.toISOString(),
        end: displayEnd.toISOString(),
        allDay: false,
        extendedProps: {
          isGreyEvent: true,
          eventCount: events.length,
          originalEvents: events
        },
        backgroundColor: '#e0e0e0',
        borderColor: '#bdbdbd',
        textColor: '#666666'
      };
    });
  };

  // Export functionality
  const handleDownloadICS = async () => {
    try {
      const circleIds = selectedCircles.map(c => c.id);
      await downloadICalFile(circleIds);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const renderEventContent = (eventInfo) => {
    // Handle grey events (circle calendar mode)
    if (eventInfo.event.extendedProps.isGreyEvent) {
      const eventCount = eventInfo.event.extendedProps.eventCount || 1;

      return (
        <div className={styles.greyEventContent}>
          <span className={styles.greyEventText}>
            {eventCount} event{eventCount > 1 ? 's' : ''}
          </span>
        </div>
      );
    }

    // Handle regular events (my calendar mode)
    const endIso = eventInfo.event.extendedProps.originalEnd;
    const endLabel = (() => {
      if (!endIso) return '';
      try {
        const d = new Date(endIso);
        return d.toLocaleString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    })();

    // Check if event is narrow (less than 80px width)
    const isNarrow = eventInfo.event.el && eventInfo.event.el.offsetWidth < 80;

    return (
      <div className={styles.eventContent}>
        <div className={styles.eventRow}>
          <span className={styles.eventTitle}>{eventInfo.event.title}</span>
          {!isNarrow && (
            <button
              className={styles.eventDetailsButton}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(eventInfo.event);
                setShowEventDetails(true);
              }}
              title="Voir les détails"
            >
              ℹ️
            </button>
          )}
        </div>
        {!isNarrow && eventInfo.event.extendedProps.address && (
          <div className={styles.eventLocation}>
            📍 {eventInfo.event.extendedProps.address.city || 'Lieu'}
          </div>
        )}
      </div>
    );
  };

  // Prepare events for calendar display
  const displayEvents = calendarMode === 'my' ? events : convertGreyEventsToCalendar(greyEvents);

  return (
    <div className={styles.calendarContainer}>
      <Header
        toggleLeftMenu={() => setIsLeftMenuOpen(!isLeftMenuOpen)}
      />

      {isLeftMenuOpen && (
        <div className="left-menu">
          <LeftMenu closeMenu={() => setIsLeftMenuOpen(false)} />
        </div>
      )}

        {/* Circle Selector Sidebar */}
        {calendarMode === 'circle' && (
          <div data-circle-selector>
            <CircleSelector
              selectedCircles={selectedCircles}
              onCirclesChange={handleCirclesChange}
              onGreyEventsChange={handleGreyEventsChange}
              onError={handleCircleError}
              isVisible={showCircleSelector}
              onClose={() => setShowCircleSelector(false)}
            />
          </div>
        )}


      {/* Calendar Header with Schedule Button */}
      <Box className={`${styles.calendarHeader} ${calendarMode === 'circle' ? styles.calendarHeaderWithSidebar : ''}`}>
        {/* Schedule Button - Show when not in circle mode OR when in circle mode but sidebar is closed */}
        <Box className={`${styles.headerTop} ${calendarMode === 'circle' && showCircleSelector ? styles.headerTopHidden : ''}`}>
          <Button
            variant={calendarMode === 'circle' ? 'contained' : 'outlined'}
            onClick={() => handleModeChange(null, calendarMode === 'my' ? 'circle' : 'my')}
            size="small"
            className={styles.scheduleButton}
          >
            Planning
          </Button>
        </Box>
      </Box>

      {/* Web Custom Header */}
      {!isMobile && (
        <Box className={styles.webHeader}>
          <Box className={styles.webHeaderLeft}>
            <Button
              size="small"
              onClick={handleTodayClick} className={`${styles.todayButton} ${styles.webHeaderLeftButton}`}>
              Aujourd'hui {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </Button>
          </Box>
          <Box className={styles.webHeaderCenter}>
            <Button onClick={handleWebNavPrev}>‹</Button>
            <Typography variant="h6" className={styles.webTitle}>{webTitle}</Typography>
            <Button onClick={handleWebNavNext}>›</Button>
          </Box>
          <Box className={styles.webHeaderRight}>
            <Button onClick={handleViewMenuOpen} endIcon={<ArrowDropDown />} className={`${styles.viewDropdownButton} ${styles.webHeaderRightButton}`}>
              {selectedView === 'myList' ? 'Liste' : 
               selectedView === 'dayGridMonth' ? 'Mois' : 
               selectedView === 'timeGridWeek' ? 'Semaine' : 'Vue'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Mobile Custom Header */}
      {isMobile && (
        <Box className={styles.mobileHeader}>
          <Box className={styles.mobileHeaderTop}>
            <Button
              size="small"
              onClick={handleMobileNavPrev}
            >
              ‹
            </Button>
            <Typography variant="h6" className={styles.mobileTitle}>
              {mobileTitle}
            </Typography>
            <Button
              size="small"
              onClick={handleMobileNavNext}
            >
              ›
            </Button>
          </Box>
          
          <Box className={styles.mobileHeaderBottom}>
            <Button
              size="small"
              onClick={() => {
                const api = calendarRef.current?.getApi?.();
                if (api) api.today();
              }}
              className={styles.todayButton}
            >
              Aujourd'hui {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              onClick={handleViewMenuOpen}
              endIcon={<ArrowDropDown />}
              className={styles.viewDropdownButton}
            >
              {selectedView === 'myList' ? 'Liste' : 
               selectedView === 'dayGridMonth' ? 'Mois' : 
               selectedView === 'timeGridWeek' ? 'Semaine' : 'Vue'}
            </Button>
          </Box>
        </Box>
      )}

      {/* FullCalendar Component */}
      <div className={`${styles.calendarWrapper} ${calendarMode === 'circle' ? styles.calendarWrapperWithSidebar : ''}`}>
        {activeView === 'myList' && (
          <div className={isMobile ? styles.periodButtonsContainerMobile : styles.periodButtonsContainerWeb}>
            <Button size="small" variant={listMonths === 1 ? 'contained' : 'outlined'} onClick={() => handleChangeListMonths(1)}>1M</Button>
            <Button size="small" variant={listMonths === 2 ? 'contained' : 'outlined'} onClick={() => handleChangeListMonths(2)}>2M</Button>
            <Button size="small" variant={listMonths === 6 ? 'contained' : 'outlined'} onClick={() => handleChangeListMonths(6)}>6M</Button>
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="myList"
          headerToolbar={false}
          locale="fr"
          events={displayEvents}
          dateClick={handleDateClick}
          eventClick={calendarMode === 'my' ? handleEventClick : undefined}
          eventDrop={calendarMode === 'my' ? handleEventDrop : undefined}
          eventResize={calendarMode === 'my' ? handleEventResize : undefined}
          eventContent={renderEventContent}
          height="auto"
          dayMaxEvents={3}
          moreLinkClick="popover"
          moreLinkClassNames={'zz-more-link'}
          editable={calendarMode === 'my'}
          droppable={calendarMode === 'my'}
          selectable={calendarMode === 'my'}
          selectMirror={calendarMode === 'my'}
          weekends={true}
          nowIndicator={true}
          slotEventOverlap={false}
          displayEventTime={false}
          eventDisplay="block"
          dayHeaderFormat={{ weekday: 'short' }}
          slotMinTime="08:00:00"
          slotMaxTime="23:00:00"
          allDaySlot={true}
          allDayText={'hors période'}
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          buttonText={{
            today: `Aujourd'hui ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`,
            month: 'Mois',
            week: 'Semaine',
            list: 'Liste'
          }}
          datesSet={(arg) => {
            setActiveView(arg.view.type);
            setSelectedView(arg.view.type);
            
            // Update titles for non-list views
            if (arg.view.type !== 'myList') {
              setMobileTitle(arg.view.title);
              setWebTitle(arg.view.title);
            }
          }}
          views={{
            myList: {
              type: 'list',
              buttonText: 'Liste',
              visibleRange: (currentDate) => {
                const { start, end } = getMonthAlignedRange(currentDate, listMonths);
                return { start, end };
              }
            }
          }}
          select={(info) => {
            // User selected an interval (start/end)
            console.log('selected interval:', info.start, info.end);
          }}
          classNames={styles.fullCalendar}
        />
      </div>

      {/* View Dropdown Menu */}
      <Menu
        anchorEl={viewMenuAnchor}
        open={Boolean(viewMenuAnchor)}
        onClose={handleViewMenuClose}
        className={styles.viewMenu}
      >
        <MenuItem onClick={() => handleViewChange('myList')}>
          Liste
        </MenuItem>
        <MenuItem onClick={() => handleViewChange('dayGridMonth')}>
          Mois
        </MenuItem>
        <MenuItem onClick={() => handleViewChange('timeGridWeek')}>
          Semaine
        </MenuItem>
      </Menu>

      {/* Bottom Section: Title and Export Buttons */}
      <Box className={styles.calendarTitleBottom}>
        <Stack direction="row" spacing={1} className={styles.bottomButtons}>
          <Tooltip title="Télécharger le fichier .ics">
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadICS}
              className={styles.exportButton}
              size="small"
            >
              Télécharger
            </Button>
          </Tooltip>
          <Tooltip title="Instructions d'export">
            <IconButton onClick={() => setShowExportModal(true)} size="small">
              <Info />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Create Event Form Modal */}
      {showCreateForm && (
        <CreateEventForm
          projectId={null}
          onEventCreated={handleEventCreated}
          onClose={() => setShowCreateForm(false)}
          initialDate={selectedDate}
        />
      )}

      {/* Edit Event Form Modal */}
      {showEditForm && selectedEvent && (
        <EditEventForm
          eventData={selectedEvent.extendedProps}
          onClose={() => setShowEditForm(false)}
          onEventUpdated={handleEventUpdated}
        />
      )}

      {/* Event View Modal */}
      {showEventView && selectedEvent && (
        <EventView
          eventId={selectedEvent.id}
          displayMode={'modal'}
          onClose={() => setShowEventView(false)}
          initialData={{
            id: selectedEvent.id,
            title: selectedEvent.title,
            address: selectedEvent.extendedProps?.address || null,
            description: selectedEvent.extendedProps?.description || '',
            creator: selectedEvent.extendedProps?.creator || '',
            circles: selectedEvent.extendedProps?.circles || [],
            start_time: selectedEvent.start?.toISOString?.() || selectedEvent.start,
            end_time: selectedEvent.extendedProps?.originalEnd || null
          }}
        />
      )}

      {/* Event Details Section */}
      {showEventDetails && selectedEvent && (
        <EventDetailsSection
          event={{
            id: selectedEvent.id,
            title: selectedEvent.title,
            description: selectedEvent.extendedProps?.description || '',
            address: selectedEvent.extendedProps?.address || null,
            circles: selectedEvent.extendedProps?.circles || [],
            start_time: selectedEvent.start?.toISOString?.() || selectedEvent.start,
            end_time: selectedEvent.extendedProps?.originalEnd || null,
            shareable_link: selectedEvent.extendedProps?.shareable_link || true,
            public_link: selectedEvent.extendedProps?.public_link || null
          }}
          isOpen={showEventDetails}
          onClose={() => setShowEventDetails(false)}
          onViewCircleMembers={handleViewCircleMembers}
        />
      )}

      {/* Circle Members Popup */}
      {showCircleMembers && circleMembersData && (
        <CircleMembersPopup
          circleId={circleMembersData.circleId}
          circleName={circleMembersData.circleName}
          onClose={() => setShowCircleMembers(false)}
        />
      )}

      {/* Export Instructions Modal */}
      <Modal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        className={styles.modal}
      >
        <Box className={styles.modalContent}>
          <Box className={styles.modalHeader}>
            <Typography variant="h6">Comment exporter vers votre calendrier</Typography>
            <IconButton onClick={() => setShowExportModal(false)}>
              <Close />
            </IconButton>
          </Box>

          <Box className={styles.modalBody}>
            <Typography variant="h6" gutterBottom>📥 Téléchargement du calendrier</Typography>
            <Typography paragraph>
              Cliquez sur "Télécharger" pour obtenir un fichier .ics que vous pouvez importer dans votre application de calendrier.
            </Typography>

            <Typography variant="subtitle2" gutterBottom>📱 Apple Calendar (macOS/iOS):</Typography>
            <Typography component="div" className={styles.instructions}>
              1. Ouvrez Calendrier<br/>
              2. Fichier → Importer<br/>
              3. Sélectionnez le fichier .ics téléchargé<br/>
              4. Les événements seront importés dans votre calendrier
            </Typography>

            <Typography variant="subtitle2" gutterBottom>🌐 Google Calendar:</Typography>
            <Typography component="div" className={styles.instructions}>
              1. Ouvrez Google Calendar<br/>
              2. À gauche, cliquez sur "+" → "Importer"<br/>
              3. Sélectionnez le fichier .ics téléchargé<br/>
              4. Cliquez sur "Importer"
            </Typography>

            <Typography variant="subtitle2" gutterBottom>📧 Outlook:</Typography>
            <Typography component="div" className={styles.instructions}>
              1. Ouvrez Outlook<br/>
              2. Fichier → Ouvrir et exporter → Importer/Exporter<br/>
              3. Sélectionnez "Importer un fichier iCalendar (.ics) ou vCalendar (.vcs)"<br/>
              4. Sélectionnez le fichier .ics téléchargé
            </Typography>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default CalendarView;
