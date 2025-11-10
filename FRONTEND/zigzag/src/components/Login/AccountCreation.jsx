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
    email: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    notNumeric: false,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsConnected } = useContext(AuthContext);

  // Check for invite_token in URL and preserve it in sessionStorage
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const redirect = queryParams.get('redirect');
    
    // Check for invite_token in redirect URL
    if (redirect) {
      const redirectParams = new URLSearchParams(redirect.split('?')[1] || '');
      const inviteToken = redirectParams.get('invite_token');
      const eventId = redirect.split('/event/')[1]?.split('?')[0];
      
      if (inviteToken && eventId) {
        sessionStorage.setItem('pending_invite_token', inviteToken);
        sessionStorage.setItem('pending_event_id', eventId);
      }
    }
    
    // Also check for invite_token directly in URL (fallback)
    const inviteToken = queryParams.get('invite_token');
    if (inviteToken) {
      sessionStorage.setItem('pending_invite_token', inviteToken);
      const currentPath = location.pathname;
      const eventMatch = currentPath.match(/\/event\/([0-9a-fA-F-]+)/);
      if (eventMatch && eventMatch[1]) {
        sessionStorage.setItem('pending_event_id', eventMatch[1]);
      }
    }
  }, [location.search, location.pathname]);

  const validatePasswordRequirements = (password) => {
    setPasswordRequirements({
      minLength: password.length >= 8,
      notNumeric: password.length > 0 && !/^\d+$/.test(password),
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Validate password requirements in real-time
    if (name === 'password') {
      validatePasswordRequirements(value);
    }
    
    // Clear field-specific errors when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: null });
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
      setError("Les mots de passe ne correspondent pas.");
      setFieldErrors({ password2: "Les mots de passe ne correspondent pas" });
      return;
    }

    // Client-side validation for password length
    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères, ne pas être entièrement numérique et ne pas être un mot de passe couramment utilisé.");
      setFieldErrors({ password: "Le mot de passe doit contenir au moins 8 caractères" });
      return;
    }

    try {
      // Trim username to remove leading/trailing spaces
      const trimmedUsername = formData.username.trim();
      
      if (!trimmedUsername) {
        setError("Le nom d'utilisateur ne peut pas être vide.");
        setFieldErrors({ username: "Le nom d'utilisateur ne peut pas être vide." });
        return;
      }

      const { email, password, password2 } = formData;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const utcOffsetMinutes = -new Date().getTimezoneOffset();
      const data = await register({ username: trimmedUsername, email, password, password2, timezone: timeZone, utc_offset_minutes: utcOffsetMinutes });
      console.log("Account created:", data);

      // Tokens are automatically stored by the register function in api.js
      setIsConnected(true);
      
      // Navigate to redirect URL if available, otherwise go to home
      const queryParams = new URLSearchParams(location.search);
      const redirect = queryParams.get('redirect');
      navigate(redirect || "/");
    } catch (err) {
      console.error(err);

      // Handle different types of errors
      if (err.response?.status === 400) {
        if (err.response.data?.username) {
          // Get the actual error message from the backend
          const usernameError = Array.isArray(err.response.data.username) 
            ? err.response.data.username[0] 
            : err.response.data.username;
          setError(usernameError);
          setFieldErrors({ username: usernameError });
        } else if (err.response.data?.email) {
          const emailError = Array.isArray(err.response.data.email) 
            ? err.response.data.email[0] 
            : err.response.data.email;
          setError(emailError);
          setFieldErrors({ email: emailError });
        } else if (err.response.data?.password) {
          setError("Le mot de passe doit contenir au moins 8 caractères, ne pas être entièrement numérique et ne pas être un mot de passe couramment utilisé.");
          setFieldErrors({ password: "Critères du mot de passe non respectés" });
        } else if (err.response.data?.password2) {
          setError("La confirmation du mot de passe ne correspond pas.");
          setFieldErrors({ password2: "La confirmation du mot de passe ne correspond pas" });
        } else {
          setError("Veuillez vérifier vos informations et réessayer.");
        }
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data) {
        setError(typeof err.response.data === 'string' ? err.response.data : "Échec de la création du compte. Veuillez réessayer.");
      } else {
        setError("Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet et réessayer.");
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Créer un compte</h2>

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
              placeholder="Entrez votre nom d'utilisateur"
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
              className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
              placeholder="Entrez votre email"
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
                placeholder="Entrez votre mot de passe"
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
            {formData.password && (
              <div className={styles.passwordRequirements}>
                <div className={styles.requirementItem}>
                  <span className={`${styles.checkmark} ${passwordRequirements.minLength ? styles.checkmarkChecked : ''}`}>
                    {passwordRequirements.minLength ? '✓' : '○'}
                  </span>
                  <span className={passwordRequirements.minLength ? styles.requirementMet : ''}>
                    Au moins 8 caractères
                  </span>
                </div>
                <div className={styles.requirementItem}>
                  <span className={`${styles.checkmark} ${passwordRequirements.notNumeric ? styles.checkmarkChecked : ''}`}>
                    {passwordRequirements.notNumeric ? '✓' : '○'}
                  </span>
                  <span className={passwordRequirements.notNumeric ? styles.requirementMet : ''}>
                    Ne pas être entièrement numérique
                  </span>
                </div>
              </div>
            )}
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
                placeholder="Confirmez votre mot de passe"
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
            Créer le compte
          </button>
        </form>

        <p className={styles.signupText}>
          Vous avez déjà un compte ?{" "}
          <button
            type="button"
            onClick={() => {
              const currentRedirect = new URLSearchParams(location.search).get('redirect');
              const redirectParam = currentRedirect ? `?redirect=${encodeURIComponent(currentRedirect)}` : '';
              navigate(`/login${redirectParam}`);
            }}
            className={styles.signupLink}
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
};

export default AccountCreation;
