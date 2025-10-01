import React, { useState } from 'react';
import axios from 'axios';
import { OPEN_CAGE_API_KEY } from '../../config';
import { Box, Typography, TextField, Button, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import styles from './Profile.module.css';

const labelSuggestions = ["Localisation d'Amis", "Travail", "Résidence Secondaire"];

const AddAddressPopup = ({ onClose, onAddAddress }) => {
  const [newAddress, setNewAddress] = useState("");
  const [newAddressLabel, setNewAddressLabel] = useState("Localisation d'Amis"); // Default label
  const [errorMessage, setErrorMessage] = useState("");
  const [localizedAddress, setLocalizedAddress] = useState(null);
  const [isLocalizing, setIsLocalizing] = useState(false);

  const handleLocalizeAddress = async () => {
    if (!newAddress.trim()) {
      setErrorMessage("Veuillez saisir une adresse à localiser.");
      return;
    }
    
    setIsLocalizing(true);
    setErrorMessage("");
    
    try {
      const response = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(newAddress)}&key=${OPEN_CAGE_API_KEY}`
      );
      
      const data = response.data;
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const { formatted, components, geometry } = result;
        const resolvedCity = components.city || components.town || components.village || "";
        
        setLocalizedAddress({
          address_line: formatted,
          city: resolvedCity,
          state: components.state || "",
          country: components.country || "",
          postal_code: components.postcode || "",
          latitude: geometry.lat,
          longitude: geometry.lng,
        });
        
        // Update the address field with the formatted address
        setNewAddress(formatted);
      } else {
        setErrorMessage("L'adresse n'a pas pu être localisée. Veuillez vérifier qu'elle est correcte.");
      }
    } catch (error) {
      console.error("Localization error:", error);
      setErrorMessage("Une erreur s'est produite lors de la localisation. Veuillez réessayer.");
    } finally {
      setIsLocalizing(false);
    }
  };

  const handleSubmit = () => {
    if (!newAddress.trim()) {
      setErrorMessage("Veuillez saisir une adresse");
      return;
    }
    
    
    if (!localizedAddress) {
      setErrorMessage("Veuillez localiser l'adresse avant de l'ajouter");
      return;
    }
    
    const fullAddress = {
      ...localizedAddress,
      label: newAddressLabel.trim() || "Aucun libellé"
    };
    
    onAddAddress(fullAddress);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <Box
        className={styles.addressPopup}
        sx={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          width: '90%',
          maxWidth: '500px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #eee',
            backgroundColor: '#f8f9fa'
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Ajouter une nouvelle adresse
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: '#777',
              '&:hover': { color: '#333' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ padding: '24px' }}>
          {/* Address Input */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Adresse : <span style={{ color: '#d32f2f' }}>*</span>
            </Typography>
            <Box sx={{ display: 'flex', gap: '10px' }}>
              <TextField
                fullWidth
                placeholder="Saisir l'adresse"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                sx={{ flex: 1 }}
                required
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleLocalizeAddress}
                disabled={isLocalizing || !newAddress.trim()}
                sx={{
                  bgcolor: '#40916c',
                  '&:hover': {
                    bgcolor: '#2d6a4f',
                  }
                }}
              >
                {isLocalizing ? "Localisation..." : "Localiser"}
              </Button>
            </Box>
          </Box>

          {/* Label Input */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Libellé :
            </Typography>
            <TextField
              fullWidth
              placeholder="ex. Localisation d'Amis, Travail"
              value={newAddressLabel}
              onChange={(e) => setNewAddressLabel(e.target.value)}
            />
            
            {/* Label Suggestions */}
            <Box className={styles.labelSuggestions} sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: '#666', mr: 1 }}>
                Suggestions :
              </Typography>
              {labelSuggestions.map((label, index) => (
                <Box
                  key={index}
                  className={styles.projectTag}
                  onClick={() => setNewAddressLabel(label)}
                  sx={{
                    bgcolor: newAddressLabel === label ? '#bbdefb' : '#e3f2fd',
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Error Message */}
          {errorMessage && (
            <Typography
              variant="body2"
              sx={{ color: '#d32f2f', mb: 2 }}
            >
              {errorMessage}
            </Typography>
          )}

          {/* Localized Address Info */}
          {localizedAddress && (
            <Box
              sx={{
                bgcolor: '#f9f9f9',
                p: 2,
                borderRadius: '8px',
                mb: 3,
                border: '1px solid #ddd',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '4px', 
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '6px'
              }}>
                <LocationOnIcon sx={{ color: '#4285F4', mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Adresse localisée
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ margin: '2px 0' }}>
                {localizedAddress.address_line}
              </Typography>
              <Typography variant="body2" sx={{ margin: '2px 0', color: '#666', fontSize: '0.85rem' }}>
                {localizedAddress.city}
                {localizedAddress.city && localizedAddress.state ? ', ' : ''}
                {localizedAddress.state}
                {(localizedAddress.city || localizedAddress.state) && localizedAddress.country ? ', ' : ''}
                {localizedAddress.country} {localizedAddress.postal_code}
              </Typography>
            </Box>
          )}

          {/* Add note about required fields */}
          <Typography 
            variant="caption" 
            sx={{ display: 'block', mb: 2, color: '#666', fontStyle: 'italic' }}
          >
            Le champ marqué d'un <span style={{ color: '#d32f2f' }}>*</span> est obligatoire
          </Typography>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{ borderColor: '#999', color: '#666' }}
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!localizedAddress}
              sx={{
                bgcolor: '#40916c',
                '&:hover': {
                  bgcolor: '#2d6a4f',
                },
                '&.Mui-disabled': {
                  bgcolor: '#a0c4b6',
                  color: 'white'
                }
              }}
            >
              Ajouter l'adresse
            </Button>
          </Box>
        </Box>
      </Box>
    </div>
  );
};

export default AddAddressPopup; 