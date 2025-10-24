import React, { useState } from 'react';

const EventModal = ({ isOpen, onClose, invitationUrl, title = "Lien d'invitation généré" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(invitationUrl);
      } else {
        // Fallback for mobile browsers
        const textArea = document.createElement('textarea');
        textArea.value = invitationUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) {
          throw new Error('execCommand failed');
        }
      }
      
      // Show visual feedback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying invitation link:", error);
      alert("Échec de la copie du lien d'invitation");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>{title}</h3>
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>
          Partagez ce lien pour inviter d'autres personnes à rejoindre l'événement :
        </p>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          wordBreak: 'break-all',
          fontSize: '14px',
          fontFamily: 'monospace'
        }}>
          {invitationUrl}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCopyLink}
            style={{
              backgroundColor: copied ? '#2d5a3d' : '#40916c',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: copied ? 'scale(0.95)' : 'scale(1)',
              boxShadow: copied ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
