import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestPasswordReset } from "../../api/api";
import styles from "./Login.module.css";

const PasswordResetRequest = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      if (err.response?.status === 400) {
        if (err.response.data?.email) {
          const emailError = Array.isArray(err.response.data.email)
            ? err.response.data.email[0]
            : err.response.data.email;
          setError(emailError);
        } else {
          setError("Veuillez vérifier votre adresse email et réessayer.");
        }
      } else if (err.response?.status === 429) {
        setError("Trop de requêtes. Veuillez réessayer dans quelques minutes.");
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
        <h2 className={styles.title}>Réinitialiser le mot de passe</h2>

        {error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <p className={styles.error}>{error}</p>
          </div>
        )}

        {success ? (
          <div style={{
            backgroundColor: "#d1fae5",
            border: "1px solid #86efac",
            borderRadius: "0.5rem",
            padding: "1rem",
            marginBottom: "1.5rem",
            color: "#065f46"
          }}>
            <p style={{ margin: 0, fontWeight: 500 }}>✓ Email envoyé</p>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
            Si cette adresse e-mail est reconnue, vous recevrez un e-mail avec les étapes pour réinitialiser votre mot de passe. Pensez à vérifier vos spams !            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}></label>
              <input
                type="email"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
                placeholder="Entrez votre adresse email"
              />
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Envoi en cours..." : "Envoyer l'email"}
            </button>
          </form>
        )}

        <p className={styles.signupText}>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={styles.signupLink}
          >
            Retour à la connexion
          </button>
        </p>
      </div>
    </div>
  );
};

export default PasswordResetRequest;
