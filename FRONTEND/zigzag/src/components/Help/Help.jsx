import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Header from "../Header/Header";
import LeftMenu from "../LeftMenu/LeftMenu";
import settingsStyles from "../Settings/Settings.module.css";
import { faqData } from "./faqData";
import { submitContactForm } from "../../api/api";
import MarkdownIt from "markdown-it";

export default function Help() {
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [expandedQuickStart, setExpandedQuickStart] = useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState(null); // "ok" | "error" | "spam"
  const [submitting, setSubmitting] = React.useState(false);
  const [trap, setTrap] = React.useState(""); // honeypot
  const startRef = React.useRef(Date.now());
  const location = useLocation();

  const toggleLeftMenu = () => setIsLeftMenuOpen(prev => !prev);
  const md = useMemo(() => new MarkdownIt({ linkify: true, breaks: true }), []);
  
  const quickStartMarkdownPart1 = `
# 1. Créer un cercle

Les cercles vous permettent d'organiser des projets, des équipes ou des communautés.  
Allez dans "Cercles" sur le panneau de gauche → Créer un cercle, puis ajoutez un nom + un tag.

# 2. Créer votre premier marqueur

Allez dans "Projets" sur le panneau de gauche puis le bouton +  
ou le bouton + directement sur la carte  
→ définissez le titre (par exemple #mon_pseudo arrive sur ZIGZAG !"),  
la localisation, la date et la visibilité 
Le lien d'invitation rend un événement accessible à d'autres utilisateurs en dehors de vos cercles.

# 3. Rejoindre des cercles

Demandez en privé sur votre messagerie préférée de rejoindre un cercle dont vous avez entendu parler et communiquez votre pseudo au créateur du cercle.
`;

  const quickStartMarkdownPart2 = `
# 4. Mettre à jour votre profil

Pour ajouter une localisation en privée sur la carte que vous symbolisez fortement et vos disponibilités.

# 5. Calendrier

Pour vous organiser et trouver des dates communes et préparer votre prochain grand événement.

# 6. Personnaliser vos réglages

Changer votre pseudo, changer votre mot de passe, et à venir (changer votre centre-ville).

# 7. Découvrir des projets près de chez vous

Utilisez la carte ou la liste pour explorer les projets dans votre région.
`;

  const creditsMarkdown = `
ZIGZAG utilise les services et technologies suivants :

## APIs externes

**OpenCage** - pour le géocodage (conversion d'adresses en coordonnées géographiques) - [opencagedata.com](https://opencagedata.com)

**Mapbox** - pour la recherche d'autosuggestion de localisation - [mapbox.com](https://www.mapbox.com)

## Services externes

**MapTiler** - pour servir les tuiles de carte (données routières, bâtiments, terrain) - [maptiler.com](https://www.maptiler.com/copyright/) and [openstreetmap.org](https://www.openstreetmap.org/copyright)

**Leaflet** - pour l'interaction avec les cartes (bibliothèque de visualisation de cartes) - [leafletjs.com](https://leafletjs.com)

**ZigZag Team** : Pour suivre le travail et contribuer - [github.com/theoeif/zigzag](https://github.com/theoeif/zigzag)
`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isLeftMenuOpen) {
        const leftMenu = document.querySelector('.left-menu');
        const header = document.querySelector('.header');
        if (leftMenu && !leftMenu.contains(event.target) && header && !header.contains(event.target)) {
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

  // Scroll automatique vers la section Crédits si le hash #credits est présent
  useEffect(() => {
    if (location.hash === '#credits') {
      // Petit délai pour s'assurer que le DOM est rendu
      setTimeout(() => {
        const creditsSection = document.getElementById('credits-section');
        if (creditsSection) {
          creditsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.hash]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message || !email) return;
    // simple anti‑spam: honeypot and min dwell time
    if (trap) {
      setStatus("spam");
      return;
    }
    if (Date.now() - startRef.current < 2500) {
      setStatus("spam");
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      await submitContactForm({ name, email, message });
      setStatus("ok");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={settingsStyles.settingsPage}>
      <Header toggleLeftMenu={toggleLeftMenu} hideNavigationIcons={true} showRightMapIcon={true} />
      {isLeftMenuOpen && (
        <div className="left-menu">
          <LeftMenu closeMenu={() => setIsLeftMenuOpen(false)} />
        </div>
      )}
      <div className={settingsStyles.container} style={{ marginTop: 56 }}>
      <h1 className={settingsStyles.pageTitle}>Aide</h1>
      <p>
        Bienvenue sur ZIGZAG. Cette page regroupe une FAQ rapide et des liens utiles.
      </p>

      <section className={settingsStyles.passwordSection}>
        <h2 className={settingsStyles.faqTitle}>ZigZag — Guide de démarrage rapide</h2>
        <style>{`
          .quickstart-markdown {
            line-height: 1.65;
            width: 100%;
          }
          .quickstart-markdown h1 {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2d6a4f;
            margin-top: 24px;
            margin-bottom: 8px;
          }
          .quickstart-markdown h1:first-of-type {
            margin-top: 0;
          }
          .quickstart-markdown p {
            margin-bottom: 0;
            line-height: 1.6;
            color: #555;
          }
          .quickstart-expand-button {
            width: 100%;
            background: none;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px 20px;
            text-align: left;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 1rem;
            font-weight: 600;
            color: #333;
            transition: all 0.3s ease;
            margin-top: 16px;
          }
          .quickstart-expand-button:hover {
            background-color: #f8f9fa;
            border-color: #40916c;
          }
          .quickstart-expand-arrow {
            font-size: 0.8rem;
            color: #666;
            transition: transform 0.3s ease;
          }
          .quickstart-expand-arrow.expanded {
            transform: rotate(180deg);
          }
          .quickstart-expanded-content {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
          }
        `}</style>
        <div
          className="quickstart-markdown"
          dangerouslySetInnerHTML={{ __html: md.render(quickStartMarkdownPart1) }}
        />
        {!expandedQuickStart && (
          <button
            className="quickstart-expand-button"
            onClick={() => setExpandedQuickStart(!expandedQuickStart)}
            aria-expanded={expandedQuickStart}
          >
            <span>Voir plus</span>
            <span className="quickstart-expand-arrow">
              ▼
            </span>
          </button>
        )}
        {expandedQuickStart && (
          <div className="quickstart-expanded-content">
            <div
              className="quickstart-markdown"
              dangerouslySetInnerHTML={{ __html: md.render(quickStartMarkdownPart2) }}
            />
            <button
              className="quickstart-expand-button"
              onClick={() => setExpandedQuickStart(!expandedQuickStart)}
              aria-expanded={expandedQuickStart}
            >
              <span>Masquer</span>
              <span className="quickstart-expand-arrow expanded">
                ▼
              </span>
            </button>
          </div>
        )}
      </section>

      <section className={settingsStyles.faqSection}>
        <h2 className={settingsStyles.faqTitle}>FAQ</h2>
        <div className={settingsStyles.faqList}>
          {faqData.map((item, index) => (
            <div key={index} className={settingsStyles.faqItem}>
              <button
                className={settingsStyles.faqQuestion}
                onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                aria-expanded={expandedFAQ === index}
                aria-controls={`faq-panel-${index}`}
              >
                <span>{item.question}</span>
                <span className={`${settingsStyles.arrow} ${expandedFAQ === index ? settingsStyles.expanded : ''}`}>
                  ▼
                </span>
              </button>
              {expandedFAQ === index && (
                <div id={`faq-panel-${index}`} className={settingsStyles.faqAnswer}>
                  <p dangerouslySetInnerHTML={{ __html: item.answer }}></p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={settingsStyles.passwordSection}>
      <h2>Contact</h2>
      <form onSubmit={handleSubmit} className={settingsStyles.passwordForm} aria-label="Formulaire de contact">
        {/* Honeypot field (do not remove) */}
        <input
          type="text"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
        />
        <div className={settingsStyles.inputGroup}>
          <label>Nom (facultatif)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={settingsStyles.usernameInput}
            placeholder="Votre nom"
          />
        </div>
        <div className={settingsStyles.inputGroup}>
          <label>E‑mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={settingsStyles.usernameInput}
            placeholder="vous@exemple.com"
          />
        </div>
        <div className={settingsStyles.inputGroup}>
          <label>Message</label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={settingsStyles.usernameInput}
            placeholder="Décrivez votre demande"
          />
        </div>
        <div className={settingsStyles.buttonGroup}>
          <button type="submit" className={settingsStyles.saveButton} disabled={submitting || !email || !message || status === "ok"}>
            {submitting ? "Envoi…" : status === "ok" ? "✓ Envoyé" : "Envoyer"}
          </button>
          {status === "spam" && (
            <span role="alert">Soumission bloquée. Veuillez réessayer dans quelques secondes.</span>
          )}
          {status === "error" && (
            <span role="alert">Envoi indisponible pour le moment. Réessayez plus tard.</span>
          )}
        </div>
      </form>
      </section>

      <section className={settingsStyles.passwordSection}>
        <h2>Confidentialité</h2>
        <p>
          Consultez notre Politique de confidentialité pour les détails sur les
          données traitées, les finalités et vos droits.
        </p>
        <p>
          <a href="/privacy" style={{ textDecoration: "underline" }}>
            Ouvrir la Politique de confidentialité
          </a>
        </p>
      </section>

      <section id="credits-section" className={settingsStyles.passwordSection}>
        <h2>Crédits</h2>
        <style>{`
          .credits-markdown {
            line-height: 1.65;
            width: 100%;
          }
          .credits-markdown p {
            margin-bottom: 12px;
            max-width: none;
          }
          .credits-markdown h2 {
            margin-top: 20px;
            margin-bottom: 12px;
            font-size: 1.2rem;
            font-weight: 600;
            color: #2d6a4f;
          }
          .credits-markdown h2:first-of-type {
            margin-top: 0;
          }
          .credits-markdown a {
            text-decoration: underline;
          }
          .credits-markdown > p:last-child {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
          }
          @media (min-width: 768px) {
            .credits-markdown {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              column-gap: 40px;
              row-gap: 12px;
            }
            .credits-markdown > p:first-child,
            .credits-markdown h2 {
              grid-column: 1 / -1;
            }
            .credits-markdown > p:last-child {
              grid-column: 1 / -1;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
            }
          }
        `}</style>
        <div
          className="credits-markdown"
          dangerouslySetInnerHTML={{ __html: md.render(creditsMarkdown) }}
        />
      </section>
      </div>
    </div>
  );
}
