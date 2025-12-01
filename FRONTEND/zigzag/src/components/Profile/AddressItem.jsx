import React, { useState } from 'react';
import { Box, Typography, TextField, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsIcon from '@mui/icons-material/Directions';
import styles from './Profile.module.css';

const labelSuggestions = ["Domicile", "Travail", "Résidence Secondaire"];

const AddressItem = ({ address, isManageMode, onLabelUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(address.label || 'Aucun libellé');
  const [anchorEl, setAnchorEl] = useState(null);

  const handleEditClick = () => setIsEditing(true);
  const handleCancel = () => {
    setLabel(address.label || 'Aucun libellé');
    setIsEditing(false);
  };
  const handleSave = () => {
    onLabelUpdate(address.id, label);
    setIsEditing(false);
  };

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = (suggestion) => {
    if (suggestion) {
      setLabel(suggestion);
      // Automatically save when a suggestion is selected
      onLabelUpdate(address.id, suggestion);
    }
    setAnchorEl(null);
  };

  // Function to open Google Maps with the address location
  const openGoogleMaps = (e) => {
    e.stopPropagation(); // Prevent other click handlers from firing

    // Don't redirect if user has selected text (long press or selection)
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      // User is selecting text, don't redirect
      return;
    }

    // Get latitude and longitude values
    let latitude = null;
    let longitude = null;

    const addressData = address.address;

    if (addressData && addressData.latitude && addressData.longitude) {
      latitude = addressData.latitude;
      longitude = addressData.longitude;
    }

    // Verify that we have valid coordinates
    if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
      // Check if we're on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // Prepare URL schemes for different platforms
        // Google Maps app URL scheme for both iOS and Android
        const googleMapsAppUrl = `comgooglemaps://?q=${latitude},${longitude}&center=${latitude},${longitude}`;

        // Universal URL that opens in browser if app is not installed
        const googleMapsWebUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

        // First try to open the Google Maps app
        // Create a hidden iframe to try to launch the app
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = googleMapsAppUrl;

        // Append to body to attempt to open the app
        document.body.appendChild(iframe);

        // Set timeout to remove iframe and open web URL if app doesn't open
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.location.href = googleMapsWebUrl;
        }, 500);
      } else {
        // On desktop, just open in browser
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        window.open(googleMapsUrl, '_blank');
      }
    } else {
      // If coordinates are not available, try to search by address
      const addressText = addressData?.address_line || "Localisation non disponible";
      const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;
      window.open(googleMapsSearchUrl, '_blank');
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        p: 1.5,
        mb: 1.5,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        backgroundColor: 'white',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        }
      }}
    >
      <Box className={styles.addressTextContainer} sx={{ flex: 1 }} onClick={openGoogleMaps}>
        <Typography variant="body1" sx={{
          '&:hover': { color: '#4285F4' },
          userSelect: 'text',
          WebkitUserSelect: 'text',
          msUserSelect: 'text'
        }}>
          {address.address?.address_line}
        </Typography>
        <DirectionsIcon className={styles.directionIcon} sx={{ fontSize: 16 }} />
      </Box>
      <Box display="flex" alignItems="center">
        {isEditing ? (
          <>
            <TextField
              size="small"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              sx={{ width: 150, mr: 1, transition: 'width 0.3s ease' }}
            />
            <Tooltip title="Sauvegarder">
              <IconButton onClick={handleSave} size="small">
                <CheckIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Annuler">
              <IconButton onClick={handleCancel} size="small">
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Box
              className={styles.projectTag}
              onClick={isManageMode ? handleMenuOpen : undefined}
            >
              {label}
            </Box>
            {isManageMode && (
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => handleMenuClose(null)}
              >
                {labelSuggestions.map((suggestion) => (
                  <MenuItem key={suggestion} onClick={() => handleMenuClose(suggestion)}>
                    {suggestion}
                  </MenuItem>
                ))}
              </Menu>
            )}
            {isManageMode && (
              <Tooltip title="Modifier le libellé">
                <IconButton onClick={handleEditClick} size="small">
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
        {isManageMode && (
          <Tooltip title="Supprimer l'adresse">
            <IconButton onClick={() => onDelete(address.id)} size="small" sx={{ color: 'red' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default AddressItem;
