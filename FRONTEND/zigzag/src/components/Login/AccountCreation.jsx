import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { register } from "../../api/api";
import styles from "./Login.module.css";
import { AuthContext } from "../../contexts/AuthProvider";

// SVG Eye Icons
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeSlashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const AccountCreation = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsConnected } = useContext(AuthContext);

  // Check for invite_token in URL and preserve it in sessionStorage
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const inviteToken = queryParams.get('invite_token');
    if (inviteToken) {
      sessionStorage.setItem('pending_invite_token', inviteToken);
      // Extract event ID from current URL if it's an event URL
      const currentPath = location.pathname;
      const eventMatch = currentPath.match(/\/event\/([0-9a-fA-F-]+)/);
      if (eventMatch && eventMatch[1]) {
        sessionStorage.setItem('pending_event_id', eventMatch[1]);
      }
    }
  }, [location.search, location.pathname]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear field-specific errors when user starts typing
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const togglePassword2Visibility = () => {
    setShowPassword2(!showPassword2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    // Client-side validation for password match
    if (formData.password !== formData.password2) {
      setError("Passwords do not match.");
      setFieldErrors({ password2: "Passwords do not match" });
      return;
    }

    // Client-side validation for password length
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long, not entirely numeric, and should not be a commonly used password.");
      setFieldErrors({ password: "Password must be at least 8 characters long" });
      return;
    }

    try {
      const { username, password, password2 } = formData;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const utcOffsetMinutes = -new Date().getTimezoneOffset();
      const data = await register({ username, password, password2, timezone: timeZone, utc_offset_minutes: utcOffsetMinutes });
      console.log("Account created:", data);

      // Tokens are automatically stored by the register function in api.js
      setIsConnected(true);
      navigate("/");
    } catch (err) {
      console.error(err);

      // Handle different types of errors
      if (err.response?.status === 400) {
        if (err.response.data?.username) {
          setError("Username already exists. Please choose a different username.");
          setFieldErrors({ username: "Username already exists" });
        } else if (err.response.data?.password) {
          setError("Password must be at least 8 characters long, not entirely numeric, and should not be a commonly used password.");
          setFieldErrors({ password: "Password requirements not met" });
        } else if (err.response.data?.password2) {
          setError("Password confirmation does not match.");
          setFieldErrors({ password2: "Password confirmation does not match" });
        } else {
          setError("Please check your input and try again.");
        }
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data) {
        setError(typeof err.response.data === 'string' ? err.response.data : "Account creation failed. Please try again.");
      } else {
        setError("Unable to connect to the server. Please check your internet connection and try again.");
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Create Account</h2>

        {error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <p className={styles.error}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}></label>
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
            <label htmlFor="password" className={styles.label}></label>
            <div className={styles.passwordInputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={styles.passwordToggle}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password2" className={styles.label}></label>
            <div className={styles.passwordInputContainer}>
              <input
                type={showPassword2 ? "text" : "password"}
                name="password2"
                id="password2"
                value={formData.password2}
                onChange={handleChange}
                required
                className={`${styles.input} ${fieldErrors.password2 ? styles.inputError : ''}`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={togglePassword2Visibility}
                className={styles.passwordToggle}
                tabIndex="-1"
                aria-label={showPassword2 ? "Hide password" : "Show password"}
              >
                {showPassword2 ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.button}>
            Create Account
          </button>
        </form>

        <p className={styles.signupText}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={styles.signupLink}
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default AccountCreation;
