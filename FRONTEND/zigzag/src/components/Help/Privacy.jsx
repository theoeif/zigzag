import React, { useEffect, useState } from "react";
import Header from "../Header/Header";
import LeftMenu from "../LeftMenu/LeftMenu";
import settingsStyles from "../Settings/Settings.module.css";

export default function Privacy() {
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
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

  return (
    <div className={settingsStyles.settingsPage}>
      <Header toggleLeftMenu={toggleLeftMenu} hideNavigationIcons={true} />
      {isLeftMenuOpen && (
        <div className="left-menu">
          <LeftMenu closeMenu={() => setIsLeftMenuOpen(false)} />
        </div>
      )}
      <div className={settingsStyles.container} style={{ marginTop: 56 }}>
      <h1 className={settingsStyles.pageTitle}>Politique de confidentialité ZIGZAG</h1>
      <section className={settingsStyles.passwordSection}>
      <p>Dernière mise à jour: [à compléter] • Âge cible: 18+</p>

      <h2>1. Qui sommes‑nous</h2>
      <p>
        ZIGZAG est un projet open source opéré par un particulier (Théo Eiferman).
        Aucune finalité publicitaire. Pas de vente de données.
      </p>

      <h2>2. Fonctionnalités principales</h2>
      <ul>
        <li>Création/gestion d’événements (« projets ») avec localisation</li>
        <li>Cercles d’amis et partage d’événements par cercles</li>
        <li>Carte interactive (événements, position de proches selon partage)</li>
        <li>Filtres par tags/catégories et période</li>
        <li>Profils avec disponibilités (travail/vacances)</li>
      </ul>

      <h2>3. Données que nous collectons</h2>
      <ul>
        <li>Compte/utilisateur: adresse e‑mail, nom (si fourni), identifiant utilisateur</li>
        <li>
          Localisation:
          <ul>
            <li>Localisation des événements partagée selon vos cercles</li>
            <li>Localisation de l’utilisateur: optionnelle, limitée à la session, non partagée</li>
          </ul>
        </li>
        <li>Contenu fourni: titres, descriptions, tags, catégories, horaires, cercles</li>
        <li>Données techniques et pannes: journaux d’erreurs, données de crash (première partie)</li>
        <li>Métadonnées d’usage minimales (horodatages, identifiants techniques)</li>
      </ul>
      <p>Nous ne collectons PAS d’informations de paiement/credit card.</p>

      <h2>4. Finalités et bases légales (RGPD)</h2>
      <ul>
        <li>Exécution du service: création/partage d’événements, gestion des cercles, carte, e‑mails (Mailgun)</li>
        <li>Intérêt légitime: sécurité, prévention des abus, diagnostic et qualité de service</li>
        <li>Consentement: accès à la localisation pour les fonctionnalités de carte (désactivable)</li>
      </ul>

      <h2>5. Fournisseurs et transferts</h2>
      <ul>
        <li>Hébergement: Railway (EU West, Amsterdam, NL)</li>
        <li>Carte: MapTiler (tuiles), Leaflet (libre)</li>
        <li>Autocomplétion: Mapbox</li>
        <li>Géocodage: OpenCage</li>
        <li>E‑mail: Mailgun</li>
      </ul>
      <p>
        Ces services peuvent traiter l’adresse IP, requêtes et contenus nécessaires. Certains sont situés ou
        ont des serveurs hors UE; lorsque pertinent, des Clauses Contractuelles Types (SCC) sont utilisées par
        les prestataires. Liens: maptiler.com, leafletjs.com, mapbox.com, opencagedata.com, mailgun.com.
      </p>

      <h2>6. Partage</h2>
      <ul>
        <li>Pas de vente de données</li>
        <li>Pas de marketing/retargeting publicitaire</li>
        <li>Partage limité aux prestataires listés et selon vos paramètres de cercles</li>
      </ul>

      <h2>7. Conservation</h2>
      <ul>
        <li>Compte et contenus: jusqu’à suppression par l’utilisateur</li>
        <li>Localisation d’événements: jusqu’à suppression du projet</li>
        <li>Localisation utilisateur en session: éphémère</li>
        <li>Journaux/erreurs: jusqu’à 12 mois</li>
        <li>Sauvegardes: jusqu’à 30 jours</li>
      </ul>

      <h2>8. Sécurité</h2>
      <p>Mesures proportionnées (contrôles d’accès, chiffrage en transit, bonnes pratiques). Aucune sécurité n’est absolue.</p>

      <h2>9. Vos droits (UE/EEE)</h2>
      <p>
        Accès, rectification, effacement, limitation, opposition, portabilité. Vous pouvez retirer votre
        consentement à la localisation à tout moment depuis l’appareil/app. Droit de réclamation auprès de
        l’autorité de contrôle.
      </p>

      <h2>10. Enfants</h2>
      <p>Service destiné aux personnes de 18 ans et plus.</p>

      <h2>11. Suppression du compte et des données</h2>
      <p>
        Demande via le formulaire de contact. Délai de réponse/correction/suppression: jusqu’à 30 jours.
      </p>

      <h2>12. Notifications et e‑mails</h2>
      <p>
        E‑mails transactionnels (confirmations/invitations) via Mailgun. Pas de newsletters publicitaires par défaut.
      </p>

      <h2>13. Contact</h2>
      <p>
        Un formulaire intégré est disponible sur la page d’aide. Les messages sont relayés par le backend Django
        via Mailgun (adresse non exposée côté client). 
        Dépôt open source: <a href="https://github.com/theoeif/zigzag" target="_blank" rel="noreferrer">github.com/theoeif/zigzag</a>.
      </p>

      <hr />

      <h2>Étiquette de confidentialité (App Store – résumé)</h2>
      <ul>
        <li>Données liées: e‑mail, identifiant utilisateur, nom (si fourni), contenus</li>
        <li>Données non liées: journaux d’erreurs et stabilité agrégés</li>
        <li>
          Localisation:
          <ul>
            <li>Événements: associée aux contenus partagés selon vos cercles</li>
            <li>Utilisateur: uniquement en session; non partagée; pas pour publicité</li>
          </ul>
        </li>
        <li>Pas de suivi publicitaire, pas de tiers publicitaires</li>
      </ul>
      </section>
      </div>
    </div>
  );
}
