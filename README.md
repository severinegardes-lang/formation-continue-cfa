# Mini logiciel Formation Continue pour Grist / La Suite

Ce dossier contient un widget personnalisé Grist :
- `index.html`
- `style.css`
- `app.js`

## Principe
L'utilisateur est guidé :
1. Qui a pris le contact ?
2. Domaine
3. Formation filtrée par domaine
4. Session/date filtrée par formation
5. Identité et coordonnées
6. Financement, chargé d'ingénierie, relance, statut, inscription, commentaires
7. Enregistrement direct dans la table `DEMANDES`

## Tables Grist attendues
Le widget attend les tables et colonnes du fichier `KIT_IMPORT_GRIST_SUIVI_FORMATIONS_COURTES.xlsx` :
- DEMANDES
- FORMATIONS
- SESSIONS

Les noms de colonnes doivent rester identiques à ceux du kit.

## Installation (résumé)
Un widget Grist personnalisé est une page web accessible par une URL HTTPS publique.
1. Héberger ces 3 fichiers sur un hébergement statique approuvé par votre organisation.
2. Dans Grist : Ajouter nouveau > Ajouter un widget à la page > Personnalisé.
3. Dans Options du widget, renseigner l'URL HTTPS de `index.html`.
4. Accorder `Accès complet au document`, nécessaire pour lire FORMATIONS/SESSIONS et créer une ligne dans DEMANDES.
5. Agrandir le widget sur la page.

Important : n'accordez l'accès complet qu'à un widget hébergé à une adresse que votre organisation contrôle ou approuve.
