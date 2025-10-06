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
  const navigate = useNavigate();
  const { setIsConnected } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { username, password, password2 } = formData;
      const data = await register({ username, password, password2 });
      console.log("Account created:", data);

      // Tokens are automatically stored by the register function in api.js
      setIsConnected(true);
      navigate("/");
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

          <button type="submit" className={styles.button}>
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountCreation;
