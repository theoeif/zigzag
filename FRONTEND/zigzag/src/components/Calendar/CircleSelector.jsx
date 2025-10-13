import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  TextField,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { Search, SelectAll, ClearAll } from '@mui/icons-material';
import { fetchCircles, fetchGreyEvents } from '../../api/api';
import styles from './CircleSelector.module.css';

const CircleSelector = ({ selectedCircles, onCirclesChange, onGreyEventsChange, onError }) => {
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalMembers, setTotalMembers] = useState(0);
  const [error, setError] = useState(null);

  // Load circles on component mount
  useEffect(() => {
    loadCircles();
  }, []);

  // Fetch grey events when selected circles change
  useEffect(() => {
    if (selectedCircles.length > 0) {
      loadGreyEvents();
    } else {
      onGreyEventsChange([]);
      setTotalMembers(0);
      setError(null);
    }
  }, [selectedCircles]);

  const loadCircles = async () => {
    try {
      setLoading(true);
      const circlesData = await fetchCircles();
      if (circlesData) {
        setCircles(circlesData);
      }
    } catch (error) {
      console.error('Error loading circles:', error);
      setError('Failed to load circles');
    } finally {
      setLoading(false);
    }
  };

  const loadGreyEvents = async () => {
    try {
      setError(null);
      const response = await fetchGreyEvents(selectedCircles);
      setTotalMembers(response.total_members);
      onGreyEventsChange(response.grey_events || []);
    } catch (error) {
      console.error('Error loading grey events:', error);
      const errorMessage = error.response?.data?.error || 'Failed to load circle events';
      setError(errorMessage);
      onError(errorMessage);
      onGreyEventsChange([]);
    }
  };

  const handleCircleToggle = (circleId) => {
    const newSelected = selectedCircles.includes(circleId)
      ? selectedCircles.filter(id => id !== circleId)
      : [...selectedCircles, circleId];
    onCirclesChange(newSelected);
  };

  const handleSelectAll = () => {
    const allCircleIds = filteredCircles.map(circle => circle.id);
    onCirclesChange(allCircleIds);
  };

  const handleDeselectAll = () => {
    onCirclesChange([]);
  };

  const filteredCircles = circles.filter(circle =>
    circle.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box className={styles.container}>
        <Box className={styles.loadingContainer}>
          <CircularProgress size={24} />
          <Typography variant="body2" className={styles.loadingText}>
            Loading circles...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className={styles.container}>
      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search circles..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <Search className={styles.searchIcon} />
        }}
        className={styles.searchField}
      />

      {/* Select All / Deselect All */}
      <Box className={styles.actionButtons}>
        <Button
          size="small"
          startIcon={<SelectAll />}
          onClick={handleSelectAll}
          disabled={filteredCircles.length === 0}
        >
          Select All
        </Button>
        <Button
          size="small"
          startIcon={<ClearAll />}
          onClick={handleDeselectAll}
          disabled={selectedCircles.length === 0}
        >
          Deselect All
        </Button>
      </Box>

      <Divider className={styles.divider} />

      {/* Circle List */}
      <Box className={styles.circleList}>
        {filteredCircles.length === 0 ? (
          <Typography variant="body2" className={styles.noResults}>
            {searchTerm ? 'No circles found' : 'No circles available'}
          </Typography>
        ) : (
          filteredCircles.map(circle => (
            <FormControlLabel
              key={circle.id}
              control={
                <Checkbox
                  checked={selectedCircles.includes(circle.id)}
                  onChange={() => handleCircleToggle(circle.id)}
                  size="small"
                />
              }
              label={circle.name}
              className={styles.circleItem}
            />
          ))
        )}
      </Box>

      {/* Member Count and Error Display */}
      {selectedCircles.length > 0 && (
        <Box className={styles.statusContainer}>
          {error ? (
            <Alert severity="warning" className={styles.alert}>
              {error}
            </Alert>
          ) : totalMembers >= 15 ? (
            <Typography variant="body2" className={styles.memberCount}>
              {totalMembers} unique members across {selectedCircles.length} selected circles
            </Typography>
          ) : null}
        </Box>
      )}
    </Box>
  );
};

export default CircleSelector;
