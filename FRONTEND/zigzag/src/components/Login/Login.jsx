import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../../api/api";
import { AuthContext } from "../../contexts/AuthProvider";
import styles from "./Login.module.css"; // Import the CSS Module

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData);
      console.log("Logged in successfully");

      setIsConnected(true);
      
      // Navigate to the redirect path if set, otherwise go to home
      navigate(redirectPath);
    } catch (err) {
      console.error(err);
      setError(err.response?.data || "Invalid credentials");
    }
  };

  // Redirect to Django's social login URLs
  // Social login removed

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Login</h2>

        {error && <p className={styles.error}>{JSON.stringify(error)}</p>}

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
              className={styles.input}
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
              className={styles.input}
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
