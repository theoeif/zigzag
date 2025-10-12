import React, { useState, useEffect } from 'react';
import {
  Slider,
  ButtonGroup,
  Button,
  Box,
  IconButton,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import { DatePicker } from '@capacitor-community/date-picker';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const TimelineBarMobile = ({ onTimeChange, events, initialRange, inProjectView = false, onCreateEventClick }) => {
  const isSmallScreen = useMediaQuery('(max-width:599px)');
  const isVerySmallScreen = useMediaQuery('(max-width:448px)');
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
      return Math.round((end - start) / 86400000);
    }
    const diffMs = initialEndDate.getTime() - currentDate.getTime();
    const daysDiff = Math.round(diffMs / 86400000);
    return daysDiff;
  };

  // Calculate initial start day offset from current date
  const getInitialStartDay = () => {
    if (initialRange && initialRange.start) {
      const start = new Date(initialRange.start);
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

  const [maxRange, setMaxRange] = useState(Math.max(initialDaysDifference, 35));
  const [selectedDate, setSelectedDate] = useState('');

  const formatDate = (date) => {
    try {
      // Different format for mobile - no year
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return 'Date invalide';
    }
  };

  const formatDateWithTime = (date) => {
    try {
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const dayName = dayNames[dayOfWeek];

      const dayPart = d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
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

  const handleThisWeek = () => {
    const tenYearsDays = 365 * 10;
    if (maxRange === tenYearsDays) {
      const endDate = new Date(currentDate);
      endDate.setMonth(currentDate.getMonth() + 1);
      const daysDifference = Math.ceil((endDate - currentDate) / 86400000);
      setMaxRange(daysDifference);
    }

    const currentDayOfWeek = currentDate.getDay();
    const daysToSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
    const firstWeekDaysFromNow = 0;
    const firstWeekSundayPosition = firstWeekDaysFromNow + daysToSunday;

    setTimeRange([firstWeekDaysFromNow, firstWeekSundayPosition]);
  };

  const handleAllPeriod = () => {
    const endDate = new Date(currentDate);
    endDate.setMonth(currentDate.getMonth() + 1);
    const daysDifference = Math.ceil((endDate - currentDate) / 86400000);
    setMaxRange(Math.max(daysDifference, 35));
    setTimeRange([0, daysDifference]);
  };

  // Simple slider change handler - no complex logic
  const handleSliderChange = (_, newValue) => {
    setTimeRange(newValue);
  };

  // Update parent on range change
  useEffect(() => {
    const start = new Date(currentDate);
    start.setHours(0, 1, 0, 0);
    start.setDate(currentDate.getDate() + timeRange[0]);

    const end = new Date(currentDate);
    end.setHours(23, 59, 0, 0);
    end.setDate(currentDate.getDate() + timeRange[1]);

    onTimeChange({ start, end });
  }, [timeRange, currentDate, onTimeChange]);

  // Handle date selection from calendar
  const handleDateSelect = (selectedDateString) => {
    if (selectedDateString) {
      const date = new Date(selectedDateString);
      const diffDays = Math.ceil((date - currentDate) / 86400000);
      setTimeRange([diffDays, diffDays + 1]);
      setSelectedDate(selectedDateString);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        className="timeline-container"
        sx={{
          position: inProjectView ? 'relative' : 'fixed',
          bottom: inProjectView ? 'auto' : { xs: '10px', sm: '20px' },
          top: inProjectView ? 0 : 'auto',
          left: '30px',
          right: '30px',
          zIndex: 1000,
          backgroundColor: 'transparent',
          padding: { xs: '4px 20px', sm: '8px 20px' },
          borderRadius: '8px',
          boxShadow: 'none',
          border: 'none',
          backdropFilter: 'none',
          opacity: 1,
          pointerEvents: 'auto',
          height: inProjectView ? '100%' : 'auto'
        }}
      >
        {/* Slider container */}
        <Box
          className="slider-container"
          sx={{
            position: 'relative',
            py: isVerySmallScreen ? 0.5 : 5.5,
            mt: isVerySmallScreen ? 0 : { xs: 3, sm: 1 }
          }}
        >
          <Slider
            value={timeRange}
            onChange={handleSliderChange}
            min={0}
            max={maxRange}
            valueLabelDisplay="auto"
            valueLabelFormat={(value, index) => {
              const date = new Date(currentDate);
              const offset = value;
              date.setDate(currentDate.getDate() + offset);
              return formatDate(date);
            }}
            sx={{
              '& .MuiSlider-track': {
                height: 4,
                pointerEvents: 'none', // Disable track interaction
              },
              '& .MuiSlider-rail': {
                height: 4,
                pointerEvents: 'none', // Disable rail interaction
              },
              '& .MuiSlider-thumb': {
                width: 20, // Larger for mobile
                height: 20,
                pointerEvents: 'auto', // Only thumbs interactive
                zIndex: 3,
                '&:hover': { boxShadow: '0 0 0 6px rgba(63, 81, 181, 0.1)' },
                // Increase hit area on mobile
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
        </Box>

        {/* Controls */}
        <Box
          sx={{
            position: 'relative',
            mt: isVerySmallScreen ? 0 : 4,
            display: 'flex',
            flexDirection: isVerySmallScreen ? 'column' : 'row',
            justifyContent: isVerySmallScreen ? 'center' : 'space-between',
            alignItems: isVerySmallScreen ? 'center' : 'center',
            gap: isVerySmallScreen ? 0 : 0,
            '@media (max-width: 768px)': {
              gap: 1,
              mt: isVerySmallScreen ? 0 : 4
            }
          }}
        >
          {/* Left controls */}
          <Box
            className="left-controls"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.25, sm: 0.75 },
              backgroundColor: '#f0fdf4',
              padding: { xs: '4px 6px', sm: '8px 12px' },
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              zIndex: 3,
              position: isVerySmallScreen ? 'relative' : 'absolute',
              left: isVerySmallScreen ? 'auto' : { xs: '5px', sm: '0px' },
              top: isVerySmallScreen ? 'auto' : { xs: -85, sm: -40 },
              '& .MuiButton-root': {
                fontSize: '0.8rem',
                padding: '4px 12px',
                textTransform: 'none'
              },
              '@media (max-width: 768px)': {
                flex: '0 0 auto',
                '& .MuiButtonGroup-root': {
                  minWidth: 'auto',
                }
              },
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
          {/* Create event button integrated into left controls on mobile */}
          <Tooltip title="Créer un projet">
            <IconButton
              size="small"
              onClick={onCreateEventClick}
              sx={{
                color: '#40916c',
                padding: { xs: 0.5, sm: 1 },
                '&:hover': { backgroundColor: 'rgba(64, 145, 108, 0.1)' }
              }}
            >
              <AddCircleOutlineIcon fontSize={isSmallScreen ? 'small' : 'medium'} />
            </IconButton>
          </Tooltip>

          <ButtonGroup variant="text" size="small">
            <Button onClick={handleThisWeek}>
              {isSmallScreen ? 'Sem' : 'Semaine'}
            </Button>
            <Button onClick={handleAllPeriod} sx={{ fontWeight: 500 }}>
              {isSmallScreen ? '1M' : '1 Mois'}
            </Button>
          </ButtonGroup>

            {/* Hide All Time button on small screens */}
            {!isSmallScreen && !isVerySmallScreen && (
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
                  <AddIcon fontSize="medium" />
                </IconButton>
              </Tooltip>
            )}

            {/* Calendar picker - Capacitor native date picker with web fallback */}
            <Tooltip title="Sélectionner une date">
              <IconButton
                onClick={async () => {
                  try {
                    // Check if we're in a Capacitor environment
                    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                      // Prepare the date properly for Capacitor
                      let dateToUse;
                      if (selectedDate) {
                        // Ensure selectedDate is a valid date string
                        const date = new Date(selectedDate);
                        if (!isNaN(date.getTime())) {
                          // Use YYYY-MM-DD format for Capacitor plugin
                          dateToUse = date.toISOString().split('T')[0];
                        } else {
                          dateToUse = new Date().toISOString().split('T')[0];
                        }
                      } else {
                        dateToUse = new Date().toISOString().split('T')[0];
                      }

                      console.log('Capacitor DatePicker - selectedDate:', selectedDate);
                      console.log('Capacitor DatePicker - dateToUse:', dateToUse);

                      // Use Capacitor native date picker with minimal config
                      const result = await DatePicker.present({
                        mode: 'date',
                        locale: 'fr-FR',
                        date: dateToUse,
                        format: 'yyyy-MM-dd',
                        android: {
                          theme: 'light',
                        },
                        ios: {
                          style: 'wheels',
                        },
                      });

                      console.log('Capacitor DatePicker - result:', result);

                      if (result.value) {
                        handleDateSelect(result.value);
                      }
                    } else {
                      // Fallback to web date picker for web browsers
                      const input = document.createElement('input');
                      input.type = 'date';
                      input.min = new Date().toISOString().split('T')[0];
                      input.value = selectedDate || '';
                      input.style.position = 'fixed';
                      input.style.top = '50%';
                      input.style.left = '50%';
                      input.style.transform = 'translate(-50%, -50%)';
                      input.style.opacity = '0.01';
                      input.style.pointerEvents = 'none';
                      input.style.zIndex = '9999';
                      document.body.appendChild(input);

                      input.showPicker();

                      input.onchange = (e) => {
                        if (e.target.value) {
                          handleDateSelect(e.target.value);
                        }
                        document.body.removeChild(input);
                      };

                      input.onblur = () => {
                        setTimeout(() => {
                          if (document.body.contains(input)) {
                            document.body.removeChild(input);
                          }
                        }, 100);
                      };
                    }
                  } catch (error) {
                    console.error('Date picker error:', error);
                    console.error('Error details:', {
                      message: error.message,
                      stack: error.stack,
                      selectedDate: selectedDate,
                      isCapacitor: window.Capacitor && window.Capacitor.isNativePlatform()
                    });
                    // Fallback to web date picker if Capacitor fails
                    try {
                      const input = document.createElement('input');
                      input.type = 'date';
                      input.min = new Date().toISOString().split('T')[0];
                      input.value = selectedDate || '';
                      input.style.position = 'fixed';
                      input.style.top = '50%';
                      input.style.left = '50%';
                      input.style.transform = 'translate(-50%, -50%)';
                      input.style.opacity = '0.01';
                      input.style.pointerEvents = 'none';
                      input.style.zIndex = '9999';
                      document.body.appendChild(input);

                      input.showPicker();

                      input.onchange = (e) => {
                        if (e.target.value) {
                          handleDateSelect(e.target.value);
                        }
                        document.body.removeChild(input);
                      };

                      input.onblur = () => {
                        setTimeout(() => {
                          if (document.body.contains(input)) {
                            document.body.removeChild(input);
                          }
                        }, 100);
                      };
                    } catch (fallbackError) {
                      console.error('Both date picker methods failed:', fallbackError);
                    }
                  }
                }}
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

          {/* Date range display */}
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
              position: isVerySmallScreen ? 'relative' : 'absolute',
              top: isVerySmallScreen ? 'auto' : { xs: -85, sm: -40 },
              left: isVerySmallScreen ? 'auto' : { xs: 'auto', sm: 'auto' },
              right: isVerySmallScreen ? 'auto' : { xs: '5px', sm: '40px' },
              transform: { xs: 'none', sm: 'none' },
              marginTop: isVerySmallScreen ? 1 : 0,
              maxWidth: isVerySmallScreen ? 'auto' : { xs: '150px', sm: '200px', md: '90%' },
              minWidth: isVerySmallScreen ? 'auto' : { xs: '180px', sm: '150px' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              zIndex: 4
            }}
          >
            {(() => {
              const startDate = new Date(currentDate);
              startDate.setDate(currentDate.getDate() + timeRange[0]);
              startDate.setHours(0, 1, 0, 0);

              const endDate = new Date(currentDate);
              endDate.setDate(currentDate.getDate() + timeRange[1]);
              endDate.setHours(23, 59, 0, 0);

              return `${formatDateWithTime(startDate)} - ${formatDateWithTime(endDate)}`;
            })()}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TimelineBarMobile;
