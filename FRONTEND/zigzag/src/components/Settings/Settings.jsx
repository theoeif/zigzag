import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../contexts/AuthProvider';
import { changePassword, fetchUserProfile, updateProfile } from '../../api/api';
import { FaLock, FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import Header from '../Header/Header';
import LeftMenu from '../LeftMenu/LeftMenu';
import styles from './Settings.module.css';

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

  const faqData = [
    {
      question: "Comment les gens s'ajoutent-ils ?",
      answer: "Pour l'instant, les Cercles sont progressifs — ils grandissent et se connectent progressivement au fil du temps."
    },
    {
      question: "À propos de \"Je cherche\" / \"J'offre\"",
      answer: `Exemple : "Je cherche des cours d'anglais" → c'est quelque chose de plus adapté pour une plateforme comme Superprof.

Nous ne voulons pas que les gens crient dans un réseau ouvert avec des posts aléatoires "J'ai besoin de ceci / Je veux cela". Tout le monde n'a pas besoin de tout savoir.

Principe central :
- "Je veux ceci" (sans le diffuser) ou
- "Je prends ceci — le voici."

La vision est que vous déclariez "Je veux ceci" seulement à un groupe de personnes sélectionné. Cela se fait à travers les projets.

Exemple : Acheter une maison → devient un projet partagé avec les bonnes personnes.

Note : Le concept "Je veux" est difficile à définir précisément — c'est intentionnel et privé.`
    },
    {
      question: "Problèmes d'administration (Cercles)",
      answer: `1. Gestion des nouveaux membres
C'est délicat — les gens doivent actuellement demander en privé à rejoindre un Cercle auprès du créateur. Bien que les invitations aient du sens, elles compliquent aussi l'interface. Les règles changeront quand le nombre > 300.

Problème : Si les noms de Cercles sont visibles publiquement, cela pourrait mener à une exposition non désirée.

2. Ajout de membres aux Cercles
Actuellement, seul le créateur peut ajouter de nouveaux membres. Mais peut-être que n'importe quel membre pourrait ajouter d'autres personnes pour aider les Cercles à grandir plus vite (→ Cercle partagé).

Compromis :
- Avantages : Le réseau grandit rapidement (ex: comme "Lycée").
- Inconvénients : Peut devenir chaotique — pas idéal pour de petits groupes ciblés (ex: "Grimpeurs du dimanche").

3. Changement des noms de Cercles
Seul le créateur devrait être autorisé à changer le nom du Cercle. Sinon — cela devient désordonné rapidement.

<strong>Conclusion : Les Cercles doivent rester des noyaux durs où les gens travaillent sur de vrais projets.</strong>`
    },
    {
      question: "Tags",
      answer: `Les tags sont de grandes catégories où appartiennent les cercles.
(ex: "1er Cercle" : personnes que je connais et vois, "2ème Cercle" : Personnes que je connais mais ne vois plus)
- Seuls les admins peuvent configurer les tags.
- Les tags ne doivent pas être modifiables par tout le monde. Ils sont partagés entre les utilisateurs.`
    }
  ];

  const toggleLeftMenu = () => setIsLeftMenuOpen(prev => !prev);

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
                      className={styles.saveButton}
                    >
                      <FaCheck />
                    </button>
                    <button
                      type="button"
                      onClick={handleUsernameCancel}
                      disabled={isLoading}
                      className={styles.cancelButton}
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
      </div>
    </div>
  );
};

export default Settings;
