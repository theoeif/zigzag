import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Button, Box, IconButton, Tooltip, Modal, Typography, Chip, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { CalendarToday, Download, Link, Close, Info, Group, Person } from '@mui/icons-material';
import { fetchEvents, createEvent, patchEvent, deleteEvent } from '../../api/api';
import CreateEventForm from '../Project/CreateEventForm';
import EditEventForm from '../Project/EditEventForm';
import EventView from '../EventViewMap/EventView/EventView';
import EventDetailsSection from '../Project/EventDetailsSection';
import CircleMembersPopup from '../Project/CircleMembersPopup';
import CircleSelector from './CircleSelector';
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

  // Fetch events on component mount.
  useEffect(() => {
    loadEvents();
  }, []);

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
    const base = new Date(anchorDate);
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + monthCount);
    return { start, end };
  };

  const handleChangeListMonths = (months) => {
    setListMonths(months);
    const api = calendarRef.current?.getApi?.();
    if (api) {
      api.changeView('myList');
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

  // Convert grey events to FullCalendar format
  const convertGreyEventsToCalendar = (greyEventsData) => {
    if (!greyEventsData || greyEventsData.length === 0) return [];

    // Group events by date to show density
    const eventsByDate = {};
    greyEventsData.forEach(event => {
      const dateKey = new Date(event.start_time).toDateString();
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    // Create calendar events for each date with event count
    return Object.entries(eventsByDate).map(([dateKey, events]) => {
      const firstEvent = events[0];
      const startDate = new Date(firstEvent.start_time);
      const dateOnly = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

      return {
        id: `grey-${dateKey}`,
        title: `${events.length} event${events.length > 1 ? 's' : ''}`,
        start: dateOnly,
        allDay: true,
        extendedProps: {
          isGreyEvent: true,
          eventCount: events.length
        },
        backgroundColor: '#e0e0e0',
        borderColor: '#bdbdbd',
        textColor: '#666666'
      };
    });
  };

  // Export functionality
  const handleDownloadICS = () => {
    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const downloadUrl = `${baseUrl}/api/events/ical/download/?token=${token}`;
    window.open(downloadUrl, '_blank');
  };

  const handleSubscribeToCalendar = () => {
    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const feedUrl = `webcal://${baseUrl.replace(/^https?:\/\//, '')}/api/events/ical/feed/?token=${token}`;

    // Copy to clipboard
    navigator.clipboard.writeText(feedUrl).then(() => {
      alert('URL de souscription copiée ! Collez-la dans Calendrier → Fichier → Nouvelle souscription de calendrier');
    }).catch(() => {
      // Fallback: show URL in prompt
      prompt('Copiez cette URL et collez-la dans votre application de calendrier:', feedUrl);
    });
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
      <Header />

      {/* Circle Selector Sidebar */}
      {calendarMode === 'circle' && (
        <CircleSelector
          selectedCircles={selectedCircles}
          onCirclesChange={handleCirclesChange}
          onGreyEventsChange={handleGreyEventsChange}
          onError={handleCircleError}
        />
      )}

      {/* Calendar Header with Export Options */}
      <Box className={`${styles.calendarHeader} ${calendarMode === 'circle' ? styles.calendarHeaderWithSidebar : ''}`}>
        <Box className={styles.headerLeft}>
          <Typography variant="h5" className={styles.calendarTitle}>
            Calendrier
          </Typography>

          {/* Calendar Mode Toggle */}
          <ToggleButtonGroup
            value={calendarMode}
            exclusive
            onChange={handleModeChange}
            size="small"
            className={styles.modeToggle}
          >
            <ToggleButton value="my" startIcon={<Person />}>
              Mon Calendrier
            </ToggleButton>
            <ToggleButton value="circle" startIcon={<Group />}>
              Calendrier des Cercles
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Télécharger le fichier .ics">
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadICS}
              className={styles.exportButton}
            >
              Télécharger
            </Button>
          </Tooltip>
          <Tooltip title="S'abonner au calendrier">
            <Button
              variant="contained"
              startIcon={<Link />}
              onClick={handleSubscribeToCalendar}
              className={styles.subscribeButton}
            >
              S'abonner
            </Button>
          </Tooltip>
          <Tooltip title="Instructions d'export">
            <IconButton onClick={() => setShowExportModal(true)}>
              <Info />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* FullCalendar Component */}
      <div className={`${styles.calendarWrapper} ${calendarMode === 'circle' ? styles.calendarWrapperWithSidebar : ''}`}>
        {activeView === 'myList' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
            <Button size="small" variant={listMonths === 1 ? 'contained' : 'outlined'} onClick={() => handleChangeListMonths(1)}>1M</Button>
            <Button size="small" variant={listMonths === 2 ? 'contained' : 'outlined'} onClick={() => handleChangeListMonths(2)}>2M</Button>
            <Button size="small" variant={listMonths === 6 ? 'contained' : 'outlined'} onClick={() => handleChangeListMonths(6)}>6M</Button>
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,myList'
          }}
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
            list: 'Liste'
          }}
          datesSet={(arg) => setActiveView(arg.view.type)}
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
          className={styles.fullCalendar}
        />
      </div>

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
            <Typography variant="h6" gutterBottom>📥 Téléchargement (Statique)</Typography>
            <Typography paragraph>
              Cliquez sur "Télécharger" pour obtenir un fichier .ics que vous pouvez importer une seule fois.
              Les événements ne se mettront pas à jour automatiquement.
            </Typography>

            <Typography variant="h6" gutterBottom>🔄 S'abonner (Synchronisation)</Typography>
            <Typography paragraph>
              Cliquez sur "S'abonner" pour obtenir une URL de souscription. Collez cette URL dans votre application de calendrier :
            </Typography>

            <Typography variant="subtitle2" gutterBottom>📱 Apple Calendar (macOS/iOS):</Typography>
            <Typography component="div" className={styles.instructions}>
              1. Ouvrez Calendrier<br/>
              2. Fichier → Nouvelle souscription de calendrier<br/>
              3. Collez l'URL et cliquez sur "S'abonner"<br/>
              4. Les événements se mettront à jour automatiquement
            </Typography>

            <Typography variant="subtitle2" gutterBottom>🌐 Google Calendar:</Typography>
            <Typography component="div" className={styles.instructions}>
              1. Ouvrez Google Calendar<br/>
              2. À gauche, cliquez sur "+" → "À partir d'une URL"<br/>
              3. Collez l'URL et cliquez sur "Ajouter le calendrier"
            </Typography>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default CalendarView;
