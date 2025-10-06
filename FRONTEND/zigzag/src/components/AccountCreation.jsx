import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/api";
import styles from "./Login/Login.module.css";
import { AuthContext } from "../contexts/AuthProvider";

const AccountCreation = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();
  const { setIsConnected } = useContext(AuthContext);

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
    
    // Client-side validation for password match
    if (formData.password !== formData.password2) {
      setError("Passwords do not match.");
      setFieldErrors({ password2: "Passwords do not match" });
      return;
    }
    
    // Client-side validation for password length
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setFieldErrors({ password: "Password must be at least 8 characters long" });
      return;
    }
    
    try {
      const { username, password, password2 } = formData;
      const data = await register({ username, password, password2 });
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
          setError("Password requirements not met. Please ensure your password is strong enough.");
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

          <div className={styles.formGroup}>
            <label htmlFor="password2" className={styles.label}></label>
            <input
              type="password"
              name="password2"
              id="password2"
              value={formData.password2}
              onChange={handleChange}
              required
              className={`${styles.input} ${fieldErrors.password2 ? styles.inputError : ''}`}
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" className={styles.button}>
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountCreation;
