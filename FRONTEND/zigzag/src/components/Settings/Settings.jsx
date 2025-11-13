import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../../contexts/AuthProvider';
import { changePassword, fetchUserProfile, updateProfile, submitContactForm } from '../../api/api';
import { FaLock, FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import Header from '../Header/Header';
import LeftMenu from '../LeftMenu/LeftMenu';
import styles from './Settings.module.css';
import { faqData } from '../Help/faqData';

const Settings = () => {
  const { isConnected } = useContext(AuthContext);
  const [userProfile, setUserProfile] = useState(null);
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  
  // Account deletion form state
  const [deletionEmail, setDeletionEmail] = useState('');
  const [deletionStatus, setDeletionStatus] = useState(null); // "ok" | "error" | "spam"
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionTrap, setDeletionTrap] = useState(''); // honeypot
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false);
  const deletionStartRef = useRef(Date.now());

  // Fetch user profile data when connected
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await fetchUserProfile();
        if (profileData) {
          setUserProfile(profileData);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (isConnected) {
      fetchProfile();
    } else {
      setUserProfile(null);
    }
  }, [isConnected]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear message when user starts typing
    if (message.text) {
      setMessage({ type: '', text: '' });
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Client-side validation
      if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Tous les champs sont obligatoires.' });
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
        return;
      }

      if (formData.newPassword.length < 8) {
        setMessage({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
        return;
      }

      const response = await changePassword({
        old_password: formData.oldPassword,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword
      });

      setMessage({ type: 'success', text: response.message || 'Mot de passe mis à jour avec succès !' });
      
      // Clear form
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.new_password?.[0] || 
                          'Une erreur est survenue lors de la mise à jour du mot de passe.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameEdit = () => {
    setIsEditingUsername(true);
    setNewUsername(userProfile?.username || '');
    setUsernameError('');
  };

  const handleUsernameCancel = () => {
    setIsEditingUsername(false);
    setNewUsername('');
    setUsernameError('');
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setNewUsername(value);
    setUsernameError('');
    
    // Basic validation
    if (value && value.length < 3) {
      setUsernameError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    } else if (value && !/^[a-zA-Z0-9_-]+$/.test(value)) {
      setUsernameError('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores');
    }
  };

  const handleUsernameSave = async () => {
    if (!newUsername.trim()) {
      setUsernameError('Le nom d\'utilisateur ne peut pas être vide');
      return;
    }

    if (newUsername === userProfile?.username) {
      handleUsernameCancel();
      return;
    }

    setIsLoading(true);
    setUsernameError('');

    try {
      await updateProfile({ username: newUsername });
      setMessage({ type: 'success', text: 'Nom d\'utilisateur mis à jour avec succès!' });
      setIsEditingUsername(false);
      setNewUsername('');
      // Refresh user profile data
      const profileData = await fetchUserProfile();
      if (profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.username?.[0] || error.response?.data?.error || 'Erreur lors de la mise à jour du nom d\'utilisateur';
      setUsernameError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  // faqData imported from shared module

  const toggleLeftMenu = () => setIsLeftMenuOpen(prev => !prev);

  // Handle account deletion form submission
  const handleDeletionSubmit = async (e) => {
    e.preventDefault();
    if (!deletionEmail) return;
    
    // Show confirmation dialog first
    if (!showDeletionConfirm) {
      setShowDeletionConfirm(true);
      return;
    }
    
    // Anti-spam checks
    if (deletionTrap) {
      setDeletionStatus("spam");
      return;
    }
    if (Date.now() - deletionStartRef.current < 2500) {
      setDeletionStatus("spam");
      return;
    }

    setDeletionSubmitting(true);
    setDeletionStatus(null);
    try {
      await submitContactForm({ 
        name: userProfile?.username || 'Non fourni',
        email: deletionEmail,
        message: 'Demande de suppression de compte'
      });
      setDeletionStatus("ok");
      setDeletionEmail("");
      setShowDeletionConfirm(false);
    } catch (err) {
      setDeletionStatus("error");
    } finally {
      setDeletionSubmitting(false);
    }
  };

  // Close left menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isLeftMenuOpen) {
        const leftMenu = document.querySelector('.left-menu');
        const header = document.querySelector('.header');
        
        // Check if click is outside the left menu and not on the header (which contains the menu toggle)
        if (leftMenu && !leftMenu.contains(event.target) && 
            header && !header.contains(event.target)) {
          setIsLeftMenuOpen(false);
        }
      }
    };

    if (isLeftMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isLeftMenuOpen]);

  return (
    <div className={styles.settingsPage}>
      <Header toggleLeftMenu={toggleLeftMenu} />
      
      {isLeftMenuOpen && (
        <div className="left-menu">
          <LeftMenu closeMenu={() => setIsLeftMenuOpen(false)} />
        </div>
      )}

      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Paramètres</h1>
        
        {/* Password Change Section - Central Focus */}
        <section className={styles.passwordSection}>
          <div className={styles.sectionHeader}>
            <FaLock className={styles.lockIcon} />
            <h2>Changer le mot de passe</h2>
          </div>
          
          <div className={styles.usernameDisplay}>
            <label>Nom d'utilisateur</label>
            <div className={styles.lockedField}>
              {isEditingUsername ? (
                <div className={styles.usernameEditContainer}>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={handleUsernameChange}
                    className={styles.usernameInput}
                    placeholder="Nom d'utilisateur"
                    disabled={isLoading}
                  />
                  <div className={styles.usernameActions}>
                    <button
                      type="button"
                      onClick={handleUsernameSave}
                      disabled={isLoading || !!usernameError}
                      className={styles.usernameSaveButton}
                    >
                      <FaCheck />
                    </button>
                    <button
                      type="button"
                      onClick={handleUsernameCancel}
                      disabled={isLoading}
                      className={styles.usernameCancelButton}
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.usernameDisplayContainer}>
                  <span className={styles.username}>
                    {userProfile?.username || 'Chargement...'}
                  </span>
                  <button
                    type="button"
                    onClick={handleUsernameEdit}
                    disabled={isLoading}
                    className={styles.lockButton}
                    title="Modifier le nom d'utilisateur"
                  >
                    <FaLock className={styles.lockIcon} />
                  </button>
                </div>
              )}
              {usernameError && (
                <div className={styles.usernameError}>
                  {usernameError}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.passwordForm}>
            <div className={styles.inputGroup}>
              <label htmlFor="oldPassword">Mot de passe actuel</label>
              <div className={styles.passwordInput}>
                <input
                  type={showPasswords.old ? 'text' : 'password'}
                  id="oldPassword"
                  name="oldPassword"
                  value={formData.oldPassword}
                  onChange={handleInputChange}
                  placeholder="Entrez votre mot de passe actuel"
                  required
                />
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={() => togglePasswordVisibility('old')}
                >
                  {showPasswords.old ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="newPassword">Nouveau mot de passe</label>
              <div className={styles.passwordInput}>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Entrez votre nouveau mot de passe"
                  required
                  minLength="8"
                />
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
              <div className={styles.passwordInput}>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirmez votre nouveau mot de passe"
                  required
                  minLength="8"
                />
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {message.text && (
              <div className={`${styles.message} ${styles[message.type]}`}>
                {message.type === 'success' ? <FaCheck /> : <FaTimes />}
                <span>{message.text}</span>
              </div>
            )}

            <div className={styles.buttonGroup}>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={isLoading}
              >
                {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </section>

        {/* FAQ Section - Plus à venir */}
        <section className={styles.faqSection}>
          <h2 className={styles.faqTitle}>À venir</h2>
          <p className={styles.faqSubtitle}>FAQ — Aperçu de la Vision</p>
          
          <div className={styles.faqList}>
            {faqData.map((item, index) => (
              <div key={index} className={styles.faqItem}>
                <button
                  className={styles.faqQuestion}
                  onClick={() => toggleFAQ(index)}
                >
                  <span>{item.question}</span>
                  <span className={`${styles.arrow} ${expandedFAQ === index ? styles.expanded : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedFAQ === index && (
                  <div className={styles.faqAnswer}>
                    <p dangerouslySetInnerHTML={{ __html: item.answer }}></p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Account Deletion Request Section */}
        <section className={styles.passwordSection}>
          <div className={styles.sectionHeader}>
            <h2>Suppression de compte</h2>
          </div>
          <p>
            Si vous souhaitez supprimer votre compte, veuillez remplir le formulaire ci-dessous.
            Nous traiterons votre demande dans les plus brefs délais.   
            Au Maximum 30 jours pour une suppression complète.
          </p>
          <form onSubmit={handleDeletionSubmit} className={styles.passwordForm} aria-label="Formulaire de demande de suppression de compte">
            {/* Honeypot field (do not remove) */}
            <input
              type="text"
              value={deletionTrap}
              onChange={(e) => setDeletionTrap(e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
            />
            {showDeletionConfirm && (
              <div className={styles.deletionConfirm}>
                <p className={styles.deletionConfirmText}>
                  Êtes-vous vraiment sûr(e) de vouloir envoyer une demande de suppression de compte ?
                </p>
              </div>
            )}
            <div className={`${styles.usernameDisplay} ${styles.deletionUsernameDisplay}`}>
              <label>Nom d'utilisateur</label>
              <div className={styles.lockedField}>
                <div className={styles.usernameDisplayContainer}>
                  <span className={styles.username}>
                    {userProfile?.username || 'Chargement...'}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>E‑mail</label>
              <input
                type="email"
                required
                value={deletionEmail}
                onChange={(e) => setDeletionEmail(e.target.value)}
                className={styles.usernameInput}
                placeholder="vous@exemple.com"
                disabled={deletionSubmitting || deletionStatus === "ok"}
              />
            </div>
            <div className={styles.buttonGroup}>
              <button 
                type="submit" 
                className={styles.saveButton} 
                disabled={deletionSubmitting || !deletionEmail || deletionStatus === "ok"}
              >
                {deletionSubmitting ? "Envoi…" : deletionStatus === "ok" ? "✓ Envoyé" : showDeletionConfirm ? "Confirmer l'envoi" : "Envoyer la demande"}
              </button>
              {showDeletionConfirm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeletionConfirm(false);
                    setDeletionStatus(null);
                  }}
                  className={styles.cancelButton}
                  disabled={deletionSubmitting}
                >
                  Annuler
                </button>
              )}
              {deletionStatus === "spam" && (
                <span role="alert" className={styles.errorMessage}>
                  Soumission bloquée. Veuillez réessayer dans quelques secondes.
                </span>
              )}
              {deletionStatus === "error" && (
                <span role="alert" className={styles.errorMessage}>
                  Envoi indisponible pour le moment. Réessayez plus tard.
                </span>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Settings;
