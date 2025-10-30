import React, { useEffect, useState } from "react";
import Header from "../Header/Header";
import LeftMenu from "../LeftMenu/LeftMenu";
import settingsStyles from "../Settings/Settings.module.css";
import { faqData } from "./faqData";

export default function Help() {
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState(null); // "ok" | "error" | "spam"
  const [submitting, setSubmitting] = React.useState(false);
  const [trap, setTrap] = React.useState(""); // honeypot
  const startRef = React.useRef(Date.now());

  const toggleLeftMenu = () => setIsLeftMenuOpen(prev => !prev);

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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });
      if (!res.ok) throw new Error("Bad response");
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
      <Header toggleLeftMenu={toggleLeftMenu} hideNavigationIcons={true} />
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
          <button type="submit" className={settingsStyles.saveButton} disabled={submitting || !email || !message}>
            {submitting ? "Envoi…" : "Envoyer"}
          </button>
          {status === "ok" && <span role="status" aria-live="polite">Message envoyé ✔️</span>}
          {status === "spam" && (
            <span role="alert">Soumission bloquée. Veuillez réessayer dans quelques secondes.</span>
          )}
          {status === "error" && (
            <span role="alert">Envoi indisponible pour le moment. Réessayez plus tard.</span>
          )}
        </div>
      </form>
      </section>
      </div>
    </div>
  );
}
