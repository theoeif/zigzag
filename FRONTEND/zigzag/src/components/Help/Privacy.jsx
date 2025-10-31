import React, { useEffect, useMemo, useState } from "react";
import Header from "../Header/Header";
import LeftMenu from "../LeftMenu/LeftMenu";
import settingsStyles from "../Settings/Settings.module.css";
import MarkdownIt from "markdown-it";

export default function Privacy() {
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const toggleLeftMenu = () => setIsLeftMenuOpen(prev => !prev);
  const md = useMemo(() => new MarkdownIt({ linkify: true, breaks: true }), []);
  const markdown = `
Dernière mise à jour: 31/10/2025 •

# 1. Qui sommes‑nous
ZigZag est un projet open source opéré par un particulier (Théo Eiferman). Aucune finalité publicitaire. Pas de vente de données.

# 2. Fonctionnalités principales
- Création/gestion d'événements (« projets ») avec localisation
- Cercles d'amis et partage d'événements par cercles
- Carte interactive (événements, position de proches selon partage)
- Filtres par tags/catégories et période
- Profils avec disponibilités (travail/vacances)

# 3. Données que nous collectons
- Compte/utilisateur: adresse e‑mail, nom (si fourni), identifiant utilisateur
- Localisation:
  - Localisation des événements partagée selon vos cercles
  - Localisation de l'utilisateur: optionnelle, limitée à la session, non partagée
- Contenu fourni: titres, descriptions, tags, catégories, horaires, cercles
- Données techniques et pannes: journaux d'erreurs, données de crash (première partie)
- Métadonnées d'usage minimales (horodatages, identifiants techniques)

> Nous ne collectons PAS d'informations de paiement/credit card.

# 4. Finalités et bases légales (RGPD)
- Exécution du service: création/partage d'événements, gestion des cercles, carte, e‑mails (Mailgun)
- Intérêt légitime: sécurité, prévention des abus, diagnostic et qualité de service

# 5. Fournisseurs et transferts
- Hébergement: Railway (EU West, Amsterdam, NL)
- Carte: MapTiler (tuiles), Leaflet (libre)
- Autocomplétion: Mapbox
- Géocodage: OpenCage
- E‑mail: Mailgun

Ces services peuvent traiter l'adresse IP, requêtes et contenus nécessaires. Certains sont situés ou ont des serveurs hors UE; lorsque pertinent, des Clauses Contractuelles Types (SCC) sont utilisées par les prestataires. 
Liens: maptiler.com, leafletjs.com, mapbox.com, opencagedata.com, mailgun.com.

# 6. Partage
- Pas de vente de données
- Pas de marketing/retargeting publicitaire
- Partage limité aux prestataires listés et selon vos paramètres de cercles

# 7. Conservation
- Compte et contenus: jusqu'à suppression par l'utilisateur
- Localisation d'événements: jusqu'à suppression du projet
- Localisation utilisateur en session: éphémère
- Journaux/erreurs: jusqu'à 12 mois
- Sauvegardes: jusqu'à 30 jours

# 8. Sécurité
Mesures proportionnées (contrôles d'accès, chiffrage en transit, bonnes pratiques). Aucune sécurité n'est absolue.

# 9. Vos droits (UE/EEE)
Accès, rectification, effacement, limitation, opposition, portabilité. Droit de réclamation auprès de l'autorité de contrôle.

# 10. Enfants
Service destiné aux personnes de 18 ans et plus.

# 11. Suppression du compte et des données
Demande via le formulaire de contact. Délai de réponse/correction/suppression: jusqu'à 30 jours.

# 12. Notifications et e‑mails
E‑mails transactionnels (confirmations/invitations) via Mailgun. Pas de newsletters publicitaires par défaut.

# 13. Contact
Un formulaire intégré est disponible sur la page d'aide. Les messages sont relayés par le backend Django via Mailgun (adresse non exposée côté client).
Dépôt open source: https://github.com/theoeif/zigzag  
  
  

---

# Étiquette de confidentialité (App Store)
- Données liées: e‑mail, identifiant utilisateur, nom (si fourni), contenus
- Données non liées: journaux d'erreurs et stabilité agrégés
- Localisation:
  - Événements: associée aux contenus partagés selon vos cercles
  - Utilisateur: uniquement en session; non partagée; pas pour publicité
- Pas de suivi publicitaire, pas de tiers publicitaires
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

  return (
    <div className={settingsStyles.settingsPage}>
      <Header toggleLeftMenu={toggleLeftMenu} hideNavigationIcons={true} />
      {isLeftMenuOpen && (
        <div className="left-menu">
          <LeftMenu closeMenu={() => setIsLeftMenuOpen(false)} />
        </div>
      )}
      <div className={settingsStyles.container} style={{ marginTop: 56 }}>
      <h1 className={settingsStyles.pageTitle}>Politique de confidentialité</h1>
      <section className={settingsStyles.passwordSection}>
        <style>{`
          .markdown-body h1,
          .markdown-body h2 {
            color: #666;
            font-weight: 600;
          }

          /* Mobile layout fixes for list cards (e.g., Localisation blocks) */
          @media (max-width: 520px) {
            .markdown-body {
              word-break: break-word;
            }
            .markdown-body ul,
            .markdown-body ol {
              margin-left: 0;          /* avoid double indentation */
              padding-left: 18px;      /* compact list padding on small screens */
            }
            /* Ensure list items stack vertically instead of side-by-side */
            .markdown-body li {
              display: block !important;
            }
            .markdown-body li > * {
              display: block;
            }
          }
        `}</style>
        <div
          className="markdown-body"
          style={{ lineHeight: 1.65 }}
          dangerouslySetInnerHTML={{ __html: md.render(markdown) }}
        />
      </section>
      </div>
    </div>
  );
}
