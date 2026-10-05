# Hoops Stats — dossier technique pour revue

*Application de l'association Hoops Basket Association (HBA) : table de marque du dimanche, statistiques joueurs, suivi des sanctions et de la trésorerie. Ce document est destiné à une relecture externe (solidité, pérennité). Il ne contient aucune donnée personnelle.*

## 1. En deux phrases
Une page web unique (`index.html`, HTML + CSS + JavaScript sans framework, ~5 000 lignes) servie par GitHub Pages, qui lit et écrit dans une base Cloud Firestore (Firebase, projet `hba-hoops`, forfait gratuit). Les droits sont imposés côté serveur par les règles Firestore (`firestore.rules`), pas par l'interface.

## 2. Architecture

```
Navigateur (PWA installable)
  index.html  = src/app.html (appli) + src/fb-shim.js (adaptateur Firebase) + src/config.js (clés publiques)
      │  SDK Firebase compat 10.14 (auth + firestore), persistance hors-ligne activée
      ▼
Cloud Firestore (europe-west) ── règles de sécurité ── Firebase Authentication (email/mot de passe + anonyme)
```

- **Hébergement** : GitHub Pages, branche `main`, déploiement automatique à chaque commit. `build.py` assemble `index.html` à partir de `src/`.
- **Données** : collections `config`, `players`, `sessions`, `sanctions`, `payments`, `treasury`, `scorerTokens`. Une séance = un document contenant ses matchs et la liste d'événements de chaque match (`pt`, `ft`, `foul`, `tech`, `uns`, `sub`, `ast`, `out`). Le score, les fautes d'équipe, le cinq sur le terrain et toutes les stats sont **recalculés à partir des événements** (event sourcing) : corriger ou supprimer un événement recalcule tout.
- **Hors-ligne** : persistance Firestore activée ; une coupure réseau pendant un match n'interrompt pas la saisie, les écritures partent à la reconnexion. La file de sauvegarde de l'appli réessaie avec backoff et affiche un indicateur « en attente ».
- **Mode entraînement** : sans Firebase (fichier ouvert en local), l'appli bascule sur `localStorage`, bandeau jaune, aucune donnée transmise.

## 3. Rôles et sécurité

| Rôle | Comment | Peut |
|---|---|---|
| Visiteur | ouvre l'adresse, aucun compte | lire `config/main`, `players`, `sessions` (stats, classements, résumé) |
| Bureau (3 personnes) | email + mot de passe, email listé dans `config/bureau` | tout lire et écrire ; seul à voir `sanctions`, `payments`, `treasury` |
| Marqueur | lien `?marqueur=<jeton>&seance=<id>` créé par le bureau, connexion anonyme automatique | écrire **uniquement** le document de cette séance, **jusqu'à 23h59 le jour même**, si le jeton existe et n'est pas révoqué |

- `config/bureau` n'est modifiable que depuis la console Firebase (règle `update: false`) : un compte bureau compromis ne peut pas s'ajouter de complices.
- Les clés dans `config.js` sont des identifiants publics Firebase (normal) ; la sécurité repose sur les règles et l'authentification, pas sur le secret des clés.
- Pas de données de santé, pas d'adresse, pas de numéro de téléphone stockés. Noms/surnoms des joueurs, résultats, sanctions internes, montants de cotisations et participations.
- Sauvegarde : bouton « Sauvegarde JSON » (bureau) qui exporte toute la base ; réimport possible via « Première installation ».

## 4. Qualité et tests
- Tests navigateur Playwright dans `tests/` (parcours complet, stress 500 actions avec écritures en échec aléatoire, chrono, draft, corrections, couche Firebase simulée, mémoire). Fixtures anonymisées.
- Invariants vérifiés : somme des points joueurs = points équipe ; somme des +/- d'un match = 0 ; aucune exception JS sur 500 actions aléatoires.
- Pas encore : tests des règles Firestore avec l'émulateur Firebase (recommandé), accessibilité (contrastes vérifiés à la main seulement), suivi d'erreurs en production.

## 5. Limites connues et choix assumés
- **Un seul fichier** : simple à déployer et à lire d'un bloc, mais pas de découpage en modules ; au-delà de ~8 000 lignes, un découpage s'imposera.
- **Pas de framework ni de bundler** : zéro dépendance à maintenir, mais rendu par re-génération complète du HTML à chaque action (suffisant : < 20 ms mesurés).
- **Document séance unique** : pratique pour la cohérence, limite 1 Mio par document Firestore. Une séance pèse 20 à 35 Ko ; marge x30.
- **Forfait Firebase gratuit** : 50 000 lectures et 20 000 écritures par jour ; un dimanche complet consomme < 2 000 écritures. Si Google change ses quotas, le coût au-delà reste de l'ordre de l'euro par mois.
- **Dépendances externes** : SDK Firebase (CDN Google), police Google Fonts (dégradation gracieuse), GitHub Pages. Aucune bibliothèque tierce dans le code.
- **Portabilité** : la couche d'accès aux données tient dans `fb-shim.js` (150 lignes). Changer de backend (Supabase, serveur maison) = réécrire ce fichier et les règles.
- **Propriété** : projet Firebase et dépôt GitHub portés par des comptes de membres du bureau ; prévoir un compte « association » partagé et une procédure de transfert.

## 6. Questions sur lesquelles un avis extérieur est utile
1. Les règles Firestore (`firestore.rules`) : voyez-vous une faille, en particulier sur le mécanisme de jeton marqueur ?
2. Le modèle « un document par séance avec tous les événements » : tenable sur 3 saisons (≈ 150 séances) ?
3. Faut-il introduire un suivi d'erreurs en production (Sentry ou équivalent) pour une appli à 40 utilisateurs ?
4. Pérennité : que mettriez-vous en place pour que l'association ne dépende pas d'une seule personne pour faire évoluer l'outil ?
5. Ergonomie de la table de marque sur téléphone pendant un match : qu'est-ce qui vous paraît fragile ?
