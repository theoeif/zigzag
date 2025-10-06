// src/components/Callback.jsx
import { useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from "./AuthProvider";

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
      setIsConnected(true)
      navigate('/');  // Redirect to home page
    } else {
      navigate('/login');  // Fallback to login
    }
  }, [location, navigate]);

  return <div>Loading...</div>;
};

export default Callback;