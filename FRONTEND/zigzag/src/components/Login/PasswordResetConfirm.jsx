import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { confirmPasswordReset } from "../../api/api";
import styles from "./Login.module.css";

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

const PasswordResetConfirm = () => {
  const { uid, token } = useParams();
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation for password match
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setFieldErrors({ confirmPassword: "Les mots de passe ne correspondent pas" });
      return;
    }

    // Client-side validation for password length
    if (formData.newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      setFieldErrors({ newPassword: "Le mot de passe doit contenir au moins 8 caractères" });
      return;
    }

    setLoading(true);
    
    try {
      await confirmPasswordReset(uid, token, formData.newPassword, formData.confirmPassword);
      
      // Redirect to login with success message
      navigate("/login?reset=success");
    } catch (err) {
      if (err.response?.status === 400) {
        if (err.response.data?.error) {
          setError(err.response.data.error);
        } else if (err.response.data?.new_password) {
          setError(err.response.data.new_password[0] || "Le mot de passe ne répond pas aux critères requis.");
          setFieldErrors({ newPassword: err.response.data.new_password[0] });
        } else {
          setError("Une erreur est survenue. Veuillez réessayer.");
        }
      } else if (err.response?.status === 404) {
        setError("Lien de réinitialisation invalide ou expiré.");
      } else {
        setError("Une erreur est survenue. Veuillez réessayer plus tard.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Nouveau mot de passe</h2>

        {error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <p className={styles.error}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="newPassword" className={styles.label}></label>
            <div className={styles.passwordInputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                name="newPassword"
                id="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                className={`${styles.input} ${fieldErrors.newPassword ? styles.inputError : ''}`}
                placeholder="Nouveau mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}></label>
            <div className={styles.passwordInputContainer}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
                placeholder="Confirmer le mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles.passwordToggle}
                tabIndex="-1"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetConfirm;
