import React from "react";

export default function Help() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState(null); // "ok" | "error" | "spam"
  const [submitting, setSubmitting] = React.useState(false);
  const [trap, setTrap] = React.useState(""); // honeypot
  const startRef = React.useRef(Date.now());

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
    <div style={{ padding: "16px", maxWidth: 800, margin: "0 auto", marginTop: 56 }}>
      <h1>Aide</h1>
      <p>
        Bienvenue sur ZIGZAG. Cette page regroupe une FAQ rapide et des liens utiles.
      </p>

      <h2>FAQ</h2>
      <div>
        <h3>Comment fonctionne le partage des événements ?</h3>
        <p>
          Vous créez des projets/événements et choisissez avec quels cercles d’amis
          vous les partagez. Seules les personnes de ces cercles peuvent voir les
          événements partagés.
        </p>

        <h3>Ma localisation est‑elle partagée ?</h3>
        <p>
          La localisation des projets est partagée selon vos cercles. Votre
          localisation personnelle est optionnelle, limitée à la session et n’est
          pas partagée par défaut entre utilisateurs.
        </p>

        <h3>Comment supprimer mon compte et mes données ?</h3>
        <p>
          Vous pourrez demander la suppression via le formulaire de contact situé au
          bas de cette page (bientôt disponible). Le délai de traitement est de
          30 jours maximum.
        </p>
      </div>

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

      <h2>Contact</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 600 }} aria-label="Formulaire de contact">
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
        <label>
          Nom (facultatif)
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom"
          />
        </label>
        <label>
          E‑mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
          />
        </label>
        <label>
          Message
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Décrivez votre demande"
          />
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="submit" disabled={submitting || !email || !message}>
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
    </div>
  );
}
