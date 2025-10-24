// src/components/Callback.jsx
import { useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from "./AuthProvider";
import { acceptEventInvite } from '../api/api';

const Callback = () => {

  const { isConnected, setIsConnected } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlAccessToken = queryParams.get('access_token');
    const urlRefreshToken = queryParams.get('refresh_token');
    const redirectUrl = queryParams.get('redirect');

    // Check for invitation token in redirect URL
    if (redirectUrl) {
      const redirectParams = new URLSearchParams(redirectUrl.split('?')[1] || '');
      const inviteToken = redirectParams.get('invite_token');
      const eventId = redirectUrl.split('/event/')[1]?.split('?')[0];
      
      if (inviteToken && eventId) {
        sessionStorage.setItem('pending_invite_token', inviteToken);
        sessionStorage.setItem('pending_event_id', eventId);
      }
    }

    // Prioritize tokens from URL over localStorage
    const accessToken = urlAccessToken || localStorage.getItem('access_token');
    const refreshToken = urlRefreshToken || localStorage.getItem('refresh_token');

    if (accessToken && refreshToken) {
      // Only update localStorage if we got fresh tokens from URL
      if (urlAccessToken && urlRefreshToken) {
        localStorage.setItem('access_token', urlAccessToken);
        localStorage.setItem('refresh_token', urlRefreshToken);
      }
      setIsConnected(true);
      
      // Check for pending invitation after authentication
      const pendingInviteToken = sessionStorage.getItem('pending_invite_token');
      const pendingEventId = sessionStorage.getItem('pending_event_id');
      
      if (pendingInviteToken && pendingEventId) {
        // Process invitation acceptance
        acceptEventInvite(pendingEventId, pendingInviteToken)
          .then(() => {
            console.log('Successfully joined event via invitation');
            // Clear pending invitation data
            sessionStorage.removeItem('pending_invite_token');
            sessionStorage.removeItem('pending_event_id');
            // Navigate to the event page
            navigate(`/event/${pendingEventId}`);
          })
          .catch((error) => {
            console.error('Error accepting invitation:', error);
            // Clear pending invitation data even on error
            sessionStorage.removeItem('pending_invite_token');
            sessionStorage.removeItem('pending_event_id');
            // Navigate to home page
            navigate('/');
          });
      } else {
        navigate('/');  // Redirect to home page
      }
    } else {
      navigate('/login');  // Fallback to login
    }
  }, [location, navigate, setIsConnected]);

  return <div>Loading...</div>;
};

export default Callback;
