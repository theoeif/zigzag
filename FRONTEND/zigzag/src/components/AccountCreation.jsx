import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/api";
import styles from "./Login/Login.module.css";
import { AuthContext } from "../contexts/AuthProvider";

const AccountCreation = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    address: "",
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { setIsConnected } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await register(formData);
      console.log("Account created:", data);

      // Mimic login.jsx behavior: store tokens and connect
      if (data?.access && data?.refresh) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        if (data.username || formData.username) {
          localStorage.setItem("username", data.username || formData.username);
        }
        setIsConnected(true);
        navigate("/");
        return;
      }

      // Fallback: if tokens not returned (older backend), go to login
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data || "An error occurred");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Create Account</h2>

        {error && <p className={styles.error}>{JSON.stringify(error)}</p>}

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
              className={styles.input}
              placeholder="Enter your username"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}></label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={styles.input}
              placeholder="Enter your email"
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
              className={styles.input}
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
              className={styles.input}
              placeholder="Confirm your password"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="address" className={styles.label}></label>
            <textarea
              name="address"
              id="address"
              value={formData.address}
              onChange={handleChange}
              required
              className={styles.input}
              placeholder="Enter your address"
              rows={3}
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
