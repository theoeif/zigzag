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
    const accessToken = queryParams.get('access_token');
    const refreshToken = queryParams.get('refresh_token');

    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
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
