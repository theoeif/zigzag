# Timeline Toggle Component

This component provides a reusable toggle button for showing/hiding the TimelineBar across different pages.

## Usage

To add the timeline toggle button to any page that uses the TimelineBar:

1. Import the TimelineToggle component:

```jsx
import TimelineToggle from '../TimelineBar/TimelineToggle';
```

2. Add state for controlling the timeline visibility:

```jsx
const [showTimelineBar, setShowTimelineBar] = useState(true);
```

3. Create a toggle function:

```jsx
const toggleTimelineVisibility = () => {
  setShowTimelineBar(prev => !prev);
};
```

4. Add the TimelineToggle component to your render function:

```jsx
{/* Always visible timeline toggle button */}
<TimelineToggle
  isVisible={showTimelineBar}
  onToggle={toggleTimelineVisibility}
/>
```

5. Conditionally render your TimelineBar:

```jsx
{showTimelineBar && (
  <div className={styles.timelineContainerProject}>
    <TimelineBar
      onTimeChange={handleTimeChange}
      events={events}
    />
  </div>
)}
```

## Implementation Example for MarkerMaps

```jsx
import React, { useState, useCallback } from 'react';
import TimelineBar from '../TimelineBar/TimelineBar';
import TimelineToggle from '../TimelineBar/TimelineToggle';

const MarkerMaps = () => {
  // Timeline visibility state
  const [showTimelineBar, setShowTimelineBar] = useState(true);

  // Toggle function
  const toggleTimelineVisibility = () => {
    setShowTimelineBar(prev => !prev);
  };

  // Handle timeline range changes
  const handleTimeRangeChange = useCallback((range) => {
    // Process the selected date range
    console.log('Date range changed:', range);
  }, []);

  return (
    <div>
      {/* Your existing MarkerMaps code */}

      {/* Conditionally render TimelineBar */}
      {showTimelineBar && (
        <div className="timeline-container">
          <TimelineBar
            onTimeChange={handleTimeRangeChange}
            events={events}
          />
        </div>
      )}

      {/* Always visible toggle button */}
      <TimelineToggle
        isVisible={showTimelineBar}
        onToggle={toggleTimelineVisibility}
      />
    </div>
  );
};
```

This ensures consistent behavior across all pages that use the TimelineBar component while keeping each component's state independent.
