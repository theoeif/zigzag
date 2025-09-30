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
    // Default: current date + 1 month
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
    return Math.ceil((initialEndDate - currentDate) / 86400000);
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
  useEffect(() => {
    if (initialRange && initialRange.start && initialRange.end) {
      const startDay = getInitialStartDay();
      const daysDifference = getInitialDaysDifference();
      setTimeRange([startDay, startDay + daysDifference]);
    }
  }, [initialRange?.start?.getTime(), initialRange?.end?.getTime()]);

  const [maxRange, setMaxRange] = useState(Math.max(initialDaysDifference, 30)); // Ensure a minimum range of ~1 month
  const [selectedDate, setSelectedDate] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  // For dragging the overlay
  const [isDragging, setIsDragging] = useState(false);
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
    const endDays = 365 * 10;
    setMaxRange(endDays);
    setTimeRange([0, endDays]);
  };

  const handleWeek = (week) => {
    setTimeRange([week.daysFromNow, week.daysFromNow + 7]);
  };

  const getWeeks = () => {
    const weeks = [];
    const today = new Date();
    
    // Find the start of the current week (Monday)
    const currentMonday = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday (0) to get previous Monday
    currentMonday.setDate(today.getDate() + daysToMonday);
    
    let found = 0;
    // Start from -7 days to include the current week even if it started before today
    for (let i = -7; i < maxRange && found < 4; i += 7) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() + i);
      
      // Set week start at Monday 00:01
      weekStart.setHours(0, 1, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday (6 days after Monday)
      // Set week end at Sunday 23:59
      weekEnd.setHours(23, 59, 0, 0);
      
      // Calculate days from today to this Monday
      const daysFromNow = Math.ceil((weekStart - today) / 86400000);
      
      // Include weeks that are within our range (including current week even if it started before today)
      if (daysFromNow >= -7 && daysFromNow < maxRange) {
        weeks.push({
          start: new Date(weekStart),
          end: new Date(weekEnd),
          daysFromNow: daysFromNow,
          // Position button at the END of the week (Sunday 23:59)
          buttonPosition: daysFromNow + 6 // 6 days after Monday = Sunday
        });
        found++;
      }
    }
    return weeks;
  };

  // Modified: This Week now shows Monday to Sunday
  const handleThisWeek = () => {
    const tenYearsDays = 365 * 10;
    // If currently in "All Time" mode (10 years), reset to one-month reference.
    if (maxRange === tenYearsDays) {
      const endDate = new Date(currentDate);
      endDate.setMonth(currentDate.getMonth() + 1);
      const daysDifference = Math.ceil((endDate - currentDate) / 86400000);
      setMaxRange(daysDifference);
    }
    
    // Calculate Monday of current week
    const currentMonday = new Date(currentDate);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday (0) to get previous Monday
    currentMonday.setDate(currentDate.getDate() + daysToMonday);
    
    // Calculate days from today to this Monday
    const daysToCurrentMonday = Math.ceil((currentMonday - currentDate) / 86400000);
    
    // Set range from Monday to Sunday (7 days)
    setTimeRange([daysToCurrentMonday, daysToCurrentMonday + 7]);
  };
  
  const handleAllPeriod = () => {
    const endDate = new Date(currentDate);
    endDate.setMonth(currentDate.getMonth() + 1);
    const daysDifference = Math.ceil((endDate - currentDate) / 86400000);
    setMaxRange(daysDifference);
    setTimeRange([0, daysDifference]);
  };

  // Update parent on range change, with debounce to reduce excessive updates
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  useEffect(() => {
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
      
      onTimeChange({ start, end });
      setLastUpdateTime(now);
    }
  }, [timeRange, currentDate, onTimeChange, lastUpdateTime]);

  // Unified handler to compute day offset based on pointer clientX
  const updateRangeFromClientX = (clientX) => {
    if (!sliderRef.current) return;
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const sliderWidth = sliderRect.width;
    const diffX = clientX - dragStartXRef.current;
    const diffDays = Math.round((diffX / sliderWidth) * maxRange);
    let newStart = dragStartRangeRef.current[0] + diffDays;
    let newEnd = dragStartRangeRef.current[1] + diffDays;

    if (newStart < 0) {
      newEnd -= newStart;
      newStart = 0;
    }
    if (newEnd > maxRange) {
      const overshoot = newEnd - maxRange;
      newStart -= overshoot;
      newEnd = maxRange;
    }
    setTimeRange([newStart, newEnd]);
  };

  // Mouse events
  const handleOverlayMouseDown = (e) => {
    // Only start dragging when clicking directly on the overlay
    if (e.target.closest('.MuiButtonBase-root') || e.target.closest('[role="tooltip"]')) {
      return; // Don't start dragging if clicking on a button or tooltip
    }
    e.preventDefault();
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartRangeRef.current = [...timeRange];
  };

  const handleOverlayMouseMove = (e) => {
    if (!isDragging) return;
    updateRangeFromClientX(e.clientX);
  };

  const handleOverlayMouseUp = () => {
    setIsDragging(false);
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
      cursor: isDragging ? 'grabbing' : 'grab',
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
            onChange={(_, newValue) => setTimeRange(newValue)}
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
              onClick={() => setTimeRange([week.daysFromNow, week.daysFromNow + 7])}
            >
              <Box sx={{ width: '100%', height: '100%', bgcolor: 'inherit' }} />
              <Tooltip title="View week">
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
              // Position more to the right - adjusted further
              position: 'absolute',
              left: { xs: '10px', sm: '0px' }, // Moved more left on mobile
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
                {isSmallScreen ? 'Week' : 'This Week'}
              </Button>
              <Button onClick={handleAllPeriod} sx={{ fontWeight: 500 }}>
                {isSmallScreen ? '1M' : '1 Month'}
              </Button>
            </ButtonGroup>

            <Tooltip title="All time (10 years)">
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
            <Tooltip title="Select date">
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
              right: { xs: '10px', sm: '40px' }, // Positioned more right on mobile
              transform: { xs: 'none', sm: 'none' }, // Remove transform
              // Handle overflow on small screens
              maxWidth: { xs: '120px', sm: '200px', md: '90%' },
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
