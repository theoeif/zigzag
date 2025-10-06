import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../../api/api";
import { AuthContext } from "../../contexts/AuthProvider";
import styles from "./Login.module.css"; // Import the CSS Module

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsConnected } = useContext(AuthContext);
  
  // Extract redirect URL from query parameter if it exists
  const [redirectPath, setRedirectPath] = useState("/");
  
  useEffect(() => {
    // Parse query parameters to check if there's a redirect path
    const queryParams = new URLSearchParams(location.search);
    const redirect = queryParams.get('redirect');
    if (redirect) {
      setRedirectPath(redirect);
    }
  }, [location.search]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear field-specific errors when user starts typing
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    try {
      await login(formData);

      setIsConnected(true);

      // Navigate to the redirect path if set, otherwise go to home
      navigate(redirectPath);
    } catch (err) {
      console.error("Login: Error during login:", err);
      
      // Handle different types of errors
      if (err.response?.status === 401) {
        setError("Invalid username or password. Please check your credentials and try again.");
      } else if (err.response?.status === 400) {
        setError("Please fill in all required fields.");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data) {
        setError(typeof err.response.data === 'string' ? err.response.data : "Login failed. Please try again.");
      } else {
        setError("Unable to connect to the server. Please check your internet connection and try again.");
      }
    }
  };

  // Redirect to Django's social login URLs
  // Social login removed

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Login</h2>

        {error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <p className={styles.error}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
            </label>
            <input
              type="text"
              name="username"
              id="username"
              value={formData.username}
              onChange={handleChange}
              required
              className={`${styles.input} ${fieldErrors.username ? styles.inputError : ''}`}
              placeholder="Enter your username"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className={styles.button}>
            Login
          </button>
        </form>

        {/* Social login UI removed */}

        <p className={styles.signupText}>
          Don't have an account?{" "}
          <a href="/signup" className={styles.signupLink}>
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
