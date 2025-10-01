import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Slider, 
  Typography, 
  ButtonGroup, 
  Button,
  Box,
  IconButton,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CircleIcon from '@mui/icons-material/Circle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
// import './TimelineBar.css';

const TimelineBar = ({ onTimeChange, events, initialRange, inProjectView = false }) => {
  const isSmallScreen = useMediaQuery('(max-width:599px)');
  const [currentDate] = useState(new Date());
  
  // Get initial end date
  const getInitialEndDate = () => {
    if (initialRange && initialRange.end) {
      return new Date(initialRange.end);
    }
    // Default: current date + 1 month (one month range)
    const endDate = new Date(currentDate);
    endDate.setMonth(currentDate.getMonth() + 1);
    return endDate;
  };
  
  const initialEndDate = getInitialEndDate();
  
  // Calculate initial days difference based on provided range or default
  const getInitialDaysDifference = () => {
    if (initialRange && initialRange.start && initialRange.end) {
      const start = new Date(initialRange.start);
      const end = new Date(initialRange.end);
      // Use exact date diffing to avoid rounding issues
      return Math.round((end - start) / 86400000);
    }
    // For default range, calculate days from current date to end of next month
    const diffMs = initialEndDate.getTime() - currentDate.getTime();
    const daysDiff = Math.round(diffMs / 86400000);
    console.log('TimelineBar: Calculating days difference:', {
      currentDate: currentDate.toLocaleDateString(),
      initialEndDate: initialEndDate.toLocaleDateString(),
      diffMs,
      daysDiff
    });
    return daysDiff;
  };
  
  // Calculate initial start day offset from current date
  const getInitialStartDay = () => {
    if (initialRange && initialRange.start) {
      const start = new Date(initialRange.start);
      // Use exact millisecond diffing and proper rounding to prevent drift
      const diffMs = start.getTime() - currentDate.getTime();
      const daysDiff = Math.round(diffMs / 86400000);
      return daysDiff;
    }
    return 0; // Default to today
  };
  
  const initialStartDay = getInitialStartDay();
  const initialDaysDifference = getInitialDaysDifference();
  
  // Set timeRange with the initial values
  const [timeRange, setTimeRange] = useState([
    initialStartDay, 
    initialStartDay + initialDaysDifference
  ]);

  // Update timeRange when initialRange changes to ensure we sync with parent state
  // But only if the user hasn't explicitly moved the timeline
  const [userHasMovedTimeline, setUserHasMovedTimeline] = useState(() => {
    // Check if user has moved timeline in a previous session
    const hasMoved = localStorage.getItem('timelineUserMoved') === 'true';
    const hasTimelineState = localStorage.getItem('timelineState') !== null;
    const shouldPreserveState = hasMoved || hasTimelineState;
    console.log('TimelineBar: Initializing userHasMovedTimeline from localStorage:', {
      hasMoved,
      hasTimelineState,
      shouldPreserveState
    });
    return shouldPreserveState;
  });
  
  // Use localStorage to persist whether we've processed the initial range
  const hasProcessedInitialRange = useRef(() => {
    return localStorage.getItem('timelineProcessedInitial') === 'true';
  });
  
  useEffect(() => {
    // Only update timeline from initialRange if:
    // 1. User has never moved the timeline (userHasMovedTimeline is false)
    // 2. We haven't processed the initial range yet
    // 3. This is the first time the component mounts (not a re-mount from marker click)
    if (initialRange && initialRange.start && initialRange.end && !userHasMovedTimeline && !hasProcessedInitialRange.current()) {
      const startDay = getInitialStartDay();
      const daysDifference = getInitialDaysDifference();
      console.log('TimelineBar: Updating timeRange from initialRange:', {
        initialRange,
        startDay,
        daysDifference,
        userHasMovedTimeline,
        newTimeRange: [startDay, startDay + daysDifference]
      });
      setTimeRange([startDay, startDay + daysDifference]);
      localStorage.setItem('timelineProcessedInitial', 'true');
    } else if (userHasMovedTimeline) {
      console.log('TimelineBar: Skipping initialRange update - user has moved timeline');
    } else if (hasProcessedInitialRange.current()) {
      console.log('TimelineBar: Skipping initialRange update - already processed');
    }
  }, [initialRange?.start?.getTime(), initialRange?.end?.getTime(), userHasMovedTimeline]);

  // Function to save timeline state to localStorage
  const saveTimelineState = (timeRangeValue) => {
    const now = Date.now();
    
    // Calculate the actual dates for debugging
    const start = new Date(currentDate);
    start.setHours(0, 1, 0, 0);
    start.setDate(currentDate.getDate() + timeRangeValue[0]);
    
    const end = new Date(currentDate);
    end.setHours(23, 59, 0, 0);
    end.setDate(currentDate.getDate() + Math.max(timeRangeValue[1] - 1, timeRangeValue[0]));
    
    const state = {
      timeRange: timeRangeValue,
      timestamp: now,
      actualDates: {
        start: start.toISOString(),
        end: end.toISOString(),
        startFormatted: start.toLocaleDateString(),
        endFormatted: end.toLocaleDateString()
      }
    };
    localStorage.setItem('timelineState', JSON.stringify(state));
    console.log('TimelineBar: Saved timeline state:', state);
  };

  // Function to reset timeline state (useful for debugging)
  const resetTimelineState = () => {
    localStorage.removeItem('timelineUserMoved');
    localStorage.removeItem('timelineProcessedInitial');
    localStorage.removeItem('timelineState');
    setUserHasMovedTimeline(false);
    setHasRestoredState(false);
    console.log('TimelineBar: Reset timeline state');
  };

  // Restore timeline state from localStorage on mount (only once)
  const [hasRestoredState, setHasRestoredState] = useState(false);
  
  useEffect(() => {
    if (hasRestoredState) return; // Only restore once
    
    const savedState = localStorage.getItem('timelineState');
    if (savedState && userHasMovedTimeline) {
      try {
        const parsedState = JSON.parse(savedState);
        console.log('TimelineBar: Restoring timeline state from localStorage:', parsedState);
        
        // Only restore if the saved state is recent (within last 5 minutes)
        const now = Date.now();
        const stateAge = now - parsedState.timestamp;
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        if (stateAge < maxAge && parsedState.timeRange && Array.isArray(parsedState.timeRange)) {
          console.log('TimelineBar: Restoring recent timeline state:', {
            timeRange: parsedState.timeRange,
            stateAge: Math.round(stateAge / 1000) + 's ago',
            currentTimeRange: timeRange,
            savedActualDates: parsedState.actualDates
          });
          
          setTimeRange(parsedState.timeRange);
          setHasRestoredState(true);
          console.log('TimelineBar: Applied restored timeline state');
        } else {
          console.log('TimelineBar: Ignoring old timeline state:', {
            stateAge: Math.round(stateAge / 1000) + 's ago',
            maxAge: Math.round(maxAge / 1000) + 's'
          });
          setHasRestoredState(true);
        }
      } catch (error) {
        console.error('TimelineBar: Error parsing saved timeline state:', error);
        setHasRestoredState(true);
      }
    } else {
      setHasRestoredState(true);
    }
  }, [userHasMovedTimeline, hasRestoredState]);

  // Expose reset function globally for debugging
  useEffect(() => {
    window.resetTimelineState = resetTimelineState;
    return () => {
      delete window.resetTimelineState;
    };
  }, []);

  // Clear localStorage when component unmounts to allow fresh start
  useEffect(() => {
    return () => {
      // Don't clear on unmount, let it persist across sessions
      // localStorage.removeItem('timelineUserMoved');
      // localStorage.removeItem('timelineProcessedInitial');
    };
  }, []);

  const [maxRange, setMaxRange] = useState(Math.max(initialDaysDifference, 35)); // Ensure a minimum range of ~5 weeks to accommodate all week buttons
  const [selectedDate, setSelectedDate] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  // For dragging the overlay
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'left', 'right', or 'center' for moving entire range
  const [lastDragMode, setLastDragMode] = useState(null); // Track the last drag mode for slider onChange
  const [isSliderDragging, setIsSliderDragging] = useState(false); // Track if slider is being dragged
  const dragStartXRef = useRef(null);
  const dragStartRangeRef = useRef(null);
  const sliderRef = useRef();

  const formatDate = (date) => {
    try {
      // Different format for mobile - no year
      if (isSmallScreen) {
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        });
      }
      // Regular format with year for larger screens
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Date invalide';
    }
  };

  const formatDateWithTime = (date) => {
    try {
      const d = new Date(date);
      const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const dayName = dayNames[dayOfWeek];
      
      const dayPart = d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: isSmallScreen ? undefined : 'numeric',
      });
      
      return `${dayName} ${dayPart}`;
    } catch {
      return 'Date invalide';
    }
  };

  const handleAllTime = () => {
    setUserHasMovedTimeline(true);
    localStorage.setItem('timelineUserMoved', 'true');
    localStorage.setItem('timelineProcessedInitial', 'false');
    const endDays = 365 * 10;
    setMaxRange(endDays);
    setTimeRange([0, endDays]);
    
    // Save timeline state immediately
    saveTimelineState([0, endDays]);
  };

  const handleWeek = (week) => {
    setUserHasMovedTimeline(true);
    localStorage.setItem('timelineUserMoved', 'true');
    localStorage.setItem('timelineProcessedInitial', 'false');
    // Use the actual button position as the end of the week (Sunday)
    setTimeRange([week.daysFromNow, week.buttonPosition]);
  };

  const getWeeks = () => {
    const weeks = [];
    const today = new Date();
    
    // Normalize today to midnight for consistent calculations
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    
    // Special initialization for the first week: current day to Sunday
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek; // Days until next Sunday
    
    // First week: from today to Sunday
    const firstWeekStart = new Date(today);
    firstWeekStart.setHours(0, 1, 0, 0);
    const firstWeekEnd = new Date(today);
    firstWeekEnd.setDate(today.getDate() + daysToSunday);
    firstWeekEnd.setHours(23, 59, 0, 0);
    
    // Calculate days from today to first week start (today)
    const firstWeekDaysFromNow = 0;
    
    // Calculate the actual position of the Sunday button for the first week
    // Use the direct calculation: start position + days to Sunday
    const firstWeekSundayPosition = firstWeekDaysFromNow + daysToSunday;
    
    weeks.push({
      start: new Date(firstWeekStart),
      end: new Date(firstWeekEnd),
      daysFromNow: firstWeekDaysFromNow,
      // Position button at the END of the week (Sunday)
      buttonPosition: firstWeekSundayPosition
    });
    
    // Subsequent weeks: Monday to Sunday
    let found = 1; // We already have the first week
    const maxWeeks = Math.ceil(maxRange / 7); // Calculate max weeks based on range
    
    for (let weekIndex = 1; weekIndex < maxWeeks && found < 8; weekIndex++) {
      // Calculate the Monday of this week
      const weekMonday = new Date(today);
      const daysToNextMonday = daysToSunday + 1 + (weekIndex - 1) * 7; // Monday after the first week's Sunday
      weekMonday.setDate(today.getDate() + daysToNextMonday);
      weekMonday.setHours(0, 1, 0, 0);
      
      const weekSunday = new Date(weekMonday);
      weekSunday.setDate(weekMonday.getDate() + 6); // Sunday (6 days after Monday)
      weekSunday.setHours(23, 59, 0, 0);
      
      // Calculate days from today to this Monday
      const daysFromNow = Math.round((weekMonday - todayMidnight) / 86400000);
      
      // Only include weeks that are within our range
      if (daysFromNow >= 0 && daysFromNow < maxRange) {
        // Calculate the actual position of the Sunday button
        // Use the direct calculation: Monday position + 6 days = Sunday position
        const sundayPosition = daysFromNow + 6;
        
        weeks.push({
          start: new Date(weekMonday),
          end: new Date(weekSunday),
          daysFromNow: daysFromNow,
          // Position button at the END of the week (Sunday) - use actual Sunday position
          buttonPosition: sundayPosition
        });
        found++;
      }
    }
    
    return weeks;
  };

  // Modified: This Week now behaves like Semaine 1 button (today to Sunday)
  const handleThisWeek = () => {
    setUserHasMovedTimeline(true);
    localStorage.setItem('timelineUserMoved', 'true');
    localStorage.setItem('timelineProcessedInitial', 'false');
    const tenYearsDays = 365 * 10;
    // If currently in "All Time" mode (10 years), reset to one-month reference.
    if (maxRange === tenYearsDays) {
      const endDate = new Date(currentDate);
      endDate.setMonth(currentDate.getMonth() + 1);
      const daysDifference = Math.ceil((endDate - currentDate) / 86400000);
      setMaxRange(daysDifference);
    }
    
    // Use the same logic as the first week in getWeeks(): today to Sunday
    const currentDayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek; // Days until next Sunday
    
    // First week: from today to Sunday (same as Semaine 1)
    const firstWeekDaysFromNow = 0;
    const firstWeekSundayPosition = firstWeekDaysFromNow + daysToSunday;
    
    // Set range from today to Sunday (same as clicking Semaine 1 button)
    setTimeRange([firstWeekDaysFromNow, firstWeekSundayPosition]);
  };
  
  const handleAllPeriod = () => {
    setUserHasMovedTimeline(true);
    localStorage.setItem('timelineUserMoved', 'true');
    localStorage.setItem('timelineProcessedInitial', 'false');
    const endDate = new Date(currentDate);
    endDate.setMonth(currentDate.getMonth() + 1);
    const daysDifference = Math.ceil((endDate - currentDate) / 86400000);
    setMaxRange(Math.max(daysDifference, 35)); // Ensure minimum 35 days for week buttons
    setTimeRange([0, daysDifference]);
  };

  // Store the original range when dragging starts
  const [dragStartRange, setDragStartRange] = useState(null);
  const [draggedThumb, setDraggedThumb] = useState(null);

  // Handle slider mouse down to detect which thumb is being clicked
  const handleSliderMouseDown = (e) => {
    if (!sliderRef.current) return;
    
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const sliderWidth = sliderRect.width;
    const clickX = e.clientX - sliderRect.left;
    
    // Calculate the positions of the thumbs
    const leftThumbX = (timeRange[0] / maxRange) * sliderWidth;
    const rightThumbX = (timeRange[1] / maxRange) * sliderWidth;
    
    // Determine which thumb is closer to the click
    const distanceToLeft = Math.abs(clickX - leftThumbX);
    const distanceToRight = Math.abs(clickX - rightThumbX);
    
    console.log('Slider mouse down:', {
      clickX,
      leftThumbX,
      rightThumbX,
      distanceToLeft,
      distanceToRight,
      timeRange
    });
    
    // Store the original range and which thumb is being dragged
    setDragStartRange([...timeRange]);
    
    if (distanceToLeft < distanceToRight) {
      setDraggedThumb('left');
      setLastDragMode('left');
      console.log('Detected LEFT thumb click');
    } else {
      setDraggedThumb('right');
      setLastDragMode('right');
      console.log('Detected RIGHT thumb click');
    }
    
    setIsSliderDragging(true);
  };

  // Handle slider mouse up
  const handleSliderMouseUp = () => {
    console.log('Slider mouse up - resetting drag mode from:', lastDragMode);
    setIsSliderDragging(false);
    setLastDragMode(null);
    setDraggedThumb(null);
    setDragStartRange(null);
  };

  // Custom slider onChange handler that respects the detected drag mode
  const handleSliderChange = (_, newValue) => {
    console.log('Slider change debug:', {
      newValue,
      currentRange: timeRange,
      lastDragMode,
      isSliderDragging,
      draggedThumb,
      dragStartRange
    });

    // Mark that user has moved the timeline and reset the processed flag
    setUserHasMovedTimeline(true);
    localStorage.setItem('timelineUserMoved', 'true');
    localStorage.setItem('timelineProcessedInitial', 'false');
    
    // Save timeline state immediately
    saveTimelineState(newValue);
    
    if (isSliderDragging && draggedThumb === 'left') {
      // Only modify the left edge (start), keep right edge fixed
      const newStart = Math.max(0, Math.min(newValue[0], dragStartRange[1] - 1));
      setTimeRange([newStart, dragStartRange[1]]);
    } else if (isSliderDragging && draggedThumb === 'right') {
      // Only modify the right edge (end), keep left edge fixed
      const newEnd = Math.min(maxRange, Math.max(newValue[1], dragStartRange[0] + 1));
      setTimeRange([dragStartRange[0], newEnd]);
    } else if (isSliderDragging) {
      // If we're dragging but don't have a specific mode, use the newValue as-is
      setTimeRange(newValue);
    } else {
      // Default behavior - move both extremities (for programmatic changes)
      setTimeRange(newValue);
    }
  };

  // Update parent on range change, with debounce to reduce excessive updates
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  useEffect(() => {
    // Don't send updates while we're restoring state
    if (!hasRestoredState) return;
    
    const now = Date.now();
    // Limit updates to once every 50ms to avoid excessive callbacks
    if (now - lastUpdateTime > 50) {
      // Compute start at 00:01 and end inclusive at 23:59 of the last day
      const start = new Date(currentDate);
      start.setHours(0, 1, 0, 0);
      start.setDate(currentDate.getDate() + timeRange[0]);
      
      const end = new Date(currentDate);
      end.setHours(23, 59, 0, 0);
      end.setDate(currentDate.getDate() + Math.max(timeRange[1] - 1, timeRange[0]));
      
      console.log('TimelineBar: Sending time change to parent:', {
        timeRange,
        start: start.toLocaleDateString(),
        end: end.toLocaleDateString(),
        userHasMovedTimeline,
        hasRestoredState,
        calculation: {
          startDay: timeRange[0],
          endDay: timeRange[1],
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      });
      
      // Save timeline state to localStorage for persistence
      localStorage.setItem('timelineState', JSON.stringify({
        timeRange,
        start: start.toISOString(),
        end: end.toISOString(),
        timestamp: now
      }));
      
      onTimeChange({ start, end });
      setLastUpdateTime(now);
    }
  }, [timeRange, currentDate, onTimeChange, lastUpdateTime, userHasMovedTimeline, hasRestoredState]);

  // Unified handler to compute day offset based on pointer clientX
  const updateRangeFromClientX = (clientX) => {
    if (!sliderRef.current) return;
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const sliderWidth = sliderRect.width;
    const diffX = clientX - dragStartXRef.current;
    const diffDays = Math.round((diffX / sliderWidth) * maxRange);
    
    let newStart = dragStartRangeRef.current[0];
    let newEnd = dragStartRangeRef.current[1];

    if (dragMode === 'left') {
      // Only modify the left edge (start)
      newStart = Math.max(0, Math.min(dragStartRangeRef.current[0] + diffDays, newEnd - 1));
    } else if (dragMode === 'right') {
      // Only modify the right edge (end)
      newEnd = Math.min(maxRange, Math.max(dragStartRangeRef.current[1] + diffDays, newStart + 1));
    } else if (dragMode === 'center') {
      // Move the entire range (original behavior)
      newStart = dragStartRangeRef.current[0] + diffDays;
      newEnd = dragStartRangeRef.current[1] + diffDays;

      if (newStart < 0) {
        newEnd -= newStart;
        newStart = 0;
      }
      if (newEnd > maxRange) {
        const overshoot = newEnd - maxRange;
        newStart -= overshoot;
        newEnd = maxRange;
      }
    }

    setUserHasMovedTimeline(true);
    localStorage.setItem('timelineUserMoved', 'true');
    localStorage.setItem('timelineProcessedInitial', 'false');
    setTimeRange([newStart, newEnd]);
  };

  // Mouse events
  const handleOverlayMouseDown = (e) => {
    // Only start dragging when clicking directly on the overlay
    if (e.target.closest('.MuiButtonBase-root') || e.target.closest('[role="tooltip"]')) {
      return; // Don't start dragging if clicking on a button or tooltip
    }
    e.preventDefault();
    
    // Determine which part of the overlay was clicked
    if (!sliderRef.current) return;
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const sliderWidth = sliderRect.width;
    const clickX = e.clientX - sliderRect.left;
    
    // Calculate the positions of the left and right edges of the current range
    const leftEdgeX = (timeRange[0] / maxRange) * sliderWidth;
    const rightEdgeX = (timeRange[1] / maxRange) * sliderWidth;
    
    // Account for the overlay positioning (thumbMargin offset)
    const thumbMargin = 10;
    const overlayLeft = Math.min(leftEdgeX + thumbMargin, sliderWidth);
    const overlayRight = Math.max(rightEdgeX - thumbMargin, 0);
    
    // Define edge detection zones (20px from each edge of the overlay)
    const edgeZone = 20;
    const isNearLeftEdge = Math.abs(clickX - overlayLeft) <= edgeZone;
    const isNearRightEdge = Math.abs(clickX - overlayRight) <= edgeZone;
    
    // Determine drag mode
    console.log('Edge detection:', {
      clickX,
      leftEdgeX,
      rightEdgeX,
      overlayLeft,
      overlayRight,
      isNearLeftEdge,
      isNearRightEdge,
      edgeZone: 20
    });
    
    if (isNearLeftEdge && !isNearRightEdge) {
      setDragMode('left');
      setLastDragMode('left');
      console.log('Setting drag mode to LEFT');
    } else if (isNearRightEdge && !isNearLeftEdge) {
      setDragMode('right');
      setLastDragMode('right');
      console.log('Setting drag mode to RIGHT');
    } else {
      setDragMode('center'); // Click in the middle area moves the entire range
      setLastDragMode('center');
      console.log('Setting drag mode to CENTER');
    }
    
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartRangeRef.current = [...timeRange];
  };

  const handleOverlayMouseMove = (e) => {
    if (!isDragging) return;
    updateRangeFromClientX(e.clientX);
  };

  const handleOverlayMouseUp = () => {
    console.log('Mouse up - resetting drag mode from:', lastDragMode);
    setIsDragging(false);
    setDragMode(null);
    setLastDragMode(null);
    dragStartXRef.current = null;
    dragStartRangeRef.current = null;
  };

  // Touch events
  const handleOverlayTouchStart = (e) => {
    // Only start dragging when touching directly on the overlay
    if (e.target.closest('.MuiButtonBase-root') || e.target.closest('[role="tooltip"]')) {
      return; // Don't start dragging if touching a button or tooltip
    }
    if (e.touches.length === 1) {
      e.preventDefault();
      
      // Determine which part of the overlay was touched
      if (!sliderRef.current) return;
      const sliderRect = sliderRef.current.getBoundingClientRect();
      const sliderWidth = sliderRect.width;
      const touchX = e.touches[0].clientX - sliderRect.left;
      
      // Calculate the positions of the left and right edges of the current range
      const leftEdgeX = (timeRange[0] / maxRange) * sliderWidth;
      const rightEdgeX = (timeRange[1] / maxRange) * sliderWidth;
      
      // Account for the overlay positioning (thumbMargin offset)
      const thumbMargin = 10;
      const overlayLeft = Math.min(leftEdgeX + thumbMargin, sliderWidth);
      const overlayRight = Math.max(rightEdgeX - thumbMargin, 0);
      
      // Define edge detection zones (20px from each edge of the overlay)
      const edgeZone = 20;
      const isNearLeftEdge = Math.abs(touchX - overlayLeft) <= edgeZone;
      const isNearRightEdge = Math.abs(touchX - overlayRight) <= edgeZone;
      
      // Determine drag mode
      if (isNearLeftEdge && !isNearRightEdge) {
        setDragMode('left');
        setLastDragMode('left');
      } else if (isNearRightEdge && !isNearLeftEdge) {
        setDragMode('right');
        setLastDragMode('right');
      } else {
        setDragMode('center'); // Touch in the middle area moves the entire range
        setLastDragMode('center');
      }
      
      setIsDragging(true);
      dragStartXRef.current = e.touches[0].clientX;
      dragStartRangeRef.current = [...timeRange];
    }
  };

  const handleOverlayTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    updateRangeFromClientX(e.touches[0].clientX);
  };

  const handleOverlayTouchEnd = () => {
    setIsDragging(false);
    setDragMode(null);
    setLastDragMode(null);
    dragStartXRef.current = null;
    dragStartRangeRef.current = null;
  };

  // Attach global mouse listeners while dragging (for mouse events)
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleOverlayMouseMove);
      window.addEventListener('mouseup', handleOverlayMouseUp);
    } else {
      window.removeEventListener('mousemove', handleOverlayMouseMove);
      window.removeEventListener('mouseup', handleOverlayMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleOverlayMouseMove);
      window.removeEventListener('mouseup', handleOverlayMouseUp);
    };
  }, [isDragging]);

  // Attach global mouse up listener for slider dragging
  useEffect(() => {
    if (isSliderDragging) {
      window.addEventListener('mouseup', handleSliderMouseUp);
    } else {
      window.removeEventListener('mouseup', handleSliderMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleSliderMouseUp);
    };
  }, [isSliderDragging]);

  // Calculate overlay position & width based on current timeRange
  const sliderOverlayStyle = () => {
    if (!sliderRef.current) return {};
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const sliderWidth = sliderRect.width;
    const startX = (timeRange[0] / maxRange) * sliderWidth;
    const endX = (timeRange[1] / maxRange) * sliderWidth;
    // Define a margin so that the overlay doesn't cover the thumbs
    const thumbMargin = 10; // adjust as needed
    // Ensure we don't exceed boundaries
    const overlayLeft = Math.min(startX + thumbMargin, sliderWidth);
    const overlayRight = Math.max(endX - thumbMargin, 0);
    return {
      position: 'absolute',
      left: overlayLeft,
      width: Math.max(overlayRight - overlayLeft, 0),
      top: isSmallScreen ? -10 : 0,
      bottom: isSmallScreen ? -10 : 0,
      cursor: isDragging ? 
        (dragMode === 'left' ? 'w-resize' : 
         dragMode === 'right' ? 'e-resize' : 'grabbing') : 'grab',
      zIndex: 2, // Lower z-index than weekend markers (10) and buttons (20)
      backgroundColor: 'transparent', // Completely transparent for simplicity
      // Only show the overlay on desktop
      display: isSmallScreen ? 'none' : 'block',
    };
  };
  
  // Additional clickable area for the entire slider to support clicking anywhere
  const fullSliderAreaStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: isSmallScreen ? 2 : 1, // Higher z-index on mobile to ensure it's clickable
    cursor: 'pointer', // Show pointer cursor to indicate clickable
  };
  
  // Handle clicks on the full slider area
  const handleFullAreaClick = (e) => {
    // Don't handle if clicking on weeks, buttons or tooltips
    if (e.target.closest('.MuiButtonBase-root') || 
        e.target.closest('[role="tooltip"]') ||
        e.target.closest('.week-marker')) {
      return;
    }
    
    // Get click position relative to slider
    if (!sliderRef.current) return;
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const clickX = e.clientX - sliderRect.left;
    const clickPosition = (clickX / sliderRect.width) * maxRange;
    
    // Calculate new range centered around the click position
    const rangeWidth = timeRange[1] - timeRange[0];
    const halfWidth = rangeWidth / 2;
    
    let newStart = Math.round(clickPosition - halfWidth);
    let newEnd = Math.round(clickPosition + halfWidth);
    
    // Adjust if out of bounds
    if (newStart < 0) {
      newEnd -= newStart; // shift right
      newStart = 0;
    }
    
    if (newEnd > maxRange) {
      newStart -= (newEnd - maxRange); // shift left
      newEnd = maxRange;
    }
    
    // Final validation to ensure we stay in bounds
    newStart = Math.max(0, newStart);
    newEnd = Math.min(maxRange, newEnd);
    
    setUserHasMovedTimeline(true);
    localStorage.setItem('timelineUserMoved', 'true');
    localStorage.setItem('timelineProcessedInitial', 'false');
    setTimeRange([newStart, newEnd]);
  };

  // Handle touch events for mobile
  const handleTouchClick = (e) => {
    // Only process on mobile
    if (!isSmallScreen) return;
    
    // Don't handle if touching on weeks, buttons or tooltips
    if (e.target.closest('.MuiButtonBase-root') || 
        e.target.closest('[role="tooltip"]') ||
        e.target.closest('.week-marker')) {
      return;
    }
    
    // Get touch position relative to slider
    if (!sliderRef.current || !e.touches[0]) return;
    
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - sliderRect.left;
    const touchPosition = (touchX / sliderRect.width) * maxRange;
    
    // Calculate new range centered around the touch position
    const rangeWidth = timeRange[1] - timeRange[0];
    const halfWidth = rangeWidth / 2;
    
    let newStart = Math.round(touchPosition - halfWidth);
    let newEnd = Math.round(touchPosition + halfWidth);
    
    // Adjust if out of bounds
    if (newStart < 0) {
      newEnd -= newStart; // shift right
      newStart = 0;
    }
    
    if (newEnd > maxRange) {
      newStart -= (newEnd - maxRange); // shift left
      newEnd = maxRange;
    }
    
    // Final validation to ensure we stay in bounds
    newStart = Math.max(0, newStart);
    newEnd = Math.min(maxRange, newEnd);
    
    setUserHasMovedTimeline(true);
    localStorage.setItem('timelineUserMoved', 'true');
    localStorage.setItem('timelineProcessedInitial', 'false');
    setTimeRange([newStart, newEnd]);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box 
        className="timeline-container" 
        sx={{
          position: inProjectView ? 'relative' : 'fixed',
          bottom: inProjectView ? 'auto' : { xs: '10px', sm: '20px' }, // Lower on mobile by reducing bottom distance
          top: inProjectView ? 0 : 'auto',
          left: '30px',
          right: '30px',
          zIndex: 1000,
          backgroundColor: 'transparent',
          padding: { xs: '4px 20px', sm: '8px 20px' }, // Reduced vertical padding on mobile
          borderRadius: '8px',
          boxShadow: 'none',
          border: 'none',
          backdropFilter: 'none',
          opacity: 1,
          pointerEvents: 'auto',
          height: inProjectView ? '100%' : 'auto'
        }}
      >
        {/* Slider container with reduced padding - lowered for mobile */}
        <Box 
          className="slider-container" 
          sx={{ 
            position: 'relative', 
            py: 5.5, 
            mt: { xs: 3, sm: 1 } // Increased margin top on mobile to lower the slider
          }}
          ref={sliderRef}
        >
          {/* Full slider area clickable element */}
          <Box
            style={fullSliderAreaStyle}
            onClick={handleFullAreaClick}
            onTouchStart={isSmallScreen ? handleTouchClick : undefined}
          />

          <Slider
            value={timeRange}
            onChange={handleSliderChange}
            onMouseDown={handleSliderMouseDown}
            onMouseUp={handleSliderMouseUp}
            min={0}
            max={maxRange}
            valueLabelDisplay="auto"
            valueLabelFormat={(value, index) => {
              // Show inclusive end date on the right thumb (index 1)
              const date = new Date(currentDate);
              const offset = index === 1 ? Math.max(value - 1, 0) : value;
              date.setDate(currentDate.getDate() + offset);
              return formatDate(date);
            }}
            sx={{
              '& .MuiSlider-track': { height: 4 },
              '& .MuiSlider-rail': { height: 4 },
              '& .MuiSlider-thumb': { 
                width: 14, 
                height: 14,
                zIndex: 3, // make sure thumbs are above the overlay
                '&:hover': { boxShadow: '0 0 0 6px rgba(63, 81, 181, 0.1)' },
                // Increase hit area on mobile (without enlarging visible thumb)
                '@media (max-width:599px)': {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -10,
                    left: -10,
                    right: -10,
                    bottom: -10,
                    borderRadius: '50%',
                  },
                },
              }
            }}
          />

          {/* Transparent overlay for dragging the selected range - only on desktop */}
          {!isSmallScreen && (
            <Box
              style={{
                ...sliderOverlayStyle(),
                pointerEvents: 'auto', // Always capture pointer events to enable clicking and dragging
              }}
              onMouseDown={handleOverlayMouseDown}
              onTouchStart={handleOverlayTouchStart}
              onTouchMove={handleOverlayTouchMove}
              onTouchEnd={handleOverlayTouchEnd}
            />
          )}

          {/* Week markers */}
          {!isSmallScreen && getWeeks().map((week, index) => (
            <Box
              key={index}
              className="week-marker"
              sx={{
                position: 'absolute',
                left: `${(week.buttonPosition / maxRange) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                height: '24px',
                width: '2px',
                bgcolor: 'rgba(63, 81, 181, 0.2)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                overflow: 'visible',
                zIndex: 10, // Increase z-index to ensure it's above other elements
                pointerEvents: 'auto', // Ensure pointer events work
                '&:hover': {
                  bgcolor: 'rgba(63, 81, 181, 0.8)',
                  width: '4px',
                  '&:after': {
                    content: `"${formatDateWithTime(week.start)} - ${formatDateWithTime(week.end)}"`,
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.9)',
                    color: 'white',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap'
                  }
                }
              }}
              onClick={() => handleWeek(week)}
            >
              <Box sx={{ width: '100%', height: '100%', bgcolor: 'inherit' }} />
              <Tooltip title={`Semaine ${index + 1}`}>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: '-36px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    p: 0.5,
                    bgcolor: 'primary.main',
                    color: 'white',
                    zIndex: 20, // Ensure button is above everything
                    pointerEvents: 'auto', // Ensure clicks are registered
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault(); // Add this to prevent any click bubbling
                    handleWeek(week);
                  }}
                >
                  <CircleIcon sx={{ fontSize: '14px' }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>

        {/* Controls with reduced top margin - lowered slightly */}
        <Box 
          sx={{ 
            position: 'relative', 
            mt: 4, // Increased from 3 to 4 to lower the container
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            // Keep horizontal but compress on mobile and lower more
            '@media (max-width: 768px)': {
              gap: 1,
              mt: 4 // Increased from 3 to 4 on mobile to lower controls more
            }
          }}
        >
          {/* Left controls with all 4 icons - responsive positioning */}
          <Box 
            className="left-controls" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: { xs: 0.5, sm: 2 },
              backgroundColor: '#f0fdf4',
              padding: { xs: '4px 6px', sm: '8px 12px' },
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              zIndex: 3,
              // Position more to the left to give space for date bar
              position: 'absolute',
              left: { xs: '5px', sm: '0px' }, // Moved further left on mobile
              top: { xs: -85, sm: -40 }, // Reverted back to original values
              '& .MuiButton-root': {
                fontSize: '0.8rem',
                padding: '4px 12px',
                textTransform: 'none'
              },
              // Further compress on mobile for more space
              '@media (max-width: 768px)': {
                flex: '0 0 auto',
                '& .MuiButtonGroup-root': {
                  minWidth: 'auto',
                }
              },
              // Compact layout for very small screens
              '@media (max-width: 480px)': {
                '& .MuiButton-root': {
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  minWidth: 'auto'
                },
                padding: '4px'
              }
            }}
          >
            <ButtonGroup variant="text" size="small">
              <Button onClick={handleThisWeek}>
                {isSmallScreen ? 'Sem' : 'Cette Semaine'}
              </Button>
              <Button onClick={handleAllPeriod} sx={{ fontWeight: 500 }}>
                {isSmallScreen ? '1M' : '1 Mois'}
              </Button>
            </ButtonGroup>

            <Tooltip title="Sur la période (10 ans)">
              <IconButton 
                size="small" 
                onClick={handleAllTime}
                sx={{ 
                  color: 'text.secondary',
                  padding: { xs: 0.5, sm: 1 },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.05)'
                  }
                }}
              >
                <AddIcon fontSize={isSmallScreen ? 'small' : 'medium'} />
              </IconButton>
            </Tooltip>
            
            {/* Calendar icon - back in the same container */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setUserHasMovedTimeline(true);
                localStorage.setItem('timelineUserMoved', 'true');
    localStorage.setItem('timelineProcessedInitial', 'false');
                const date = new Date(e.target.value);
                const diffDays = Math.ceil((date - currentDate) / 86400000);
                // Select a full single day (inclusive end)
                setTimeRange([diffDays, diffDays + 1]);
              }}
              min={new Date().toISOString().split('T')[0]}
              id="timeline-date-picker"
              style={{ 
                display: 'none' // Hide the actual input
              }}
            />
            <Tooltip title="Sélectionner une date">
              <IconButton
                onClick={() => document.getElementById('timeline-date-picker').showPicker()}
                size={isSmallScreen ? "small" : "medium"}
                sx={{
                  color: '#40916c', 
                  padding: { xs: 0.5, sm: 1 },
                  '&:hover': {
                    backgroundColor: 'rgba(64, 145, 108, 0.1)'
                  }
                }}
              >
                <CalendarTodayIcon fontSize={isSmallScreen ? 'small' : 'medium'} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Date range - aligned with the four icons container */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f0fdf4',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              color: '#333',
              borderRadius: '6px',
              padding: { xs: '4px 8px', sm: '8px 12px' },
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap',
              // Positioning - vertically aligned with the four icons container
              position: 'absolute',
              top: { xs: -85, sm: -40 }, // Reverted back to original values
              left: { xs: 'auto', sm: 'auto' }, // Remove centering
              right: { xs: '5px', sm: '40px' }, // Positioned more right on mobile to give more space
              transform: { xs: 'none', sm: 'none' }, // Remove transform
              // Handle overflow on small screens - make bar longer on mobile
              maxWidth: { xs: '150px', sm: '200px', md: '90%' },
              minWidth: { xs: '180px', sm: '150px' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              // Adjust zIndex to ensure it appears above other elements
              zIndex: 4
            }}
          >
            {(() => {
              // Footer shows start at 00:01 and end at 23:59
              const startDate = new Date(currentDate);
              startDate.setDate(currentDate.getDate() + timeRange[0]);
              startDate.setHours(0, 1, 0, 0);
              
              const endDate = new Date(currentDate);
              endDate.setDate(currentDate.getDate() + Math.max(timeRange[1] - 1, timeRange[0]));
              endDate.setHours(23, 59, 0, 0);
              
              return `${formatDateWithTime(startDate)} - ${formatDateWithTime(endDate)}`;
            })()}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TimelineBar;
