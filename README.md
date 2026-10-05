# Hoops Stats · Hoops Basket Association

Table de marque du dimanche, stats joueurs, sanctions et trésorerie de l'association.

- `index.html` : le site (généré, ne pas modifier à la main) — servi par GitHub Pages.
- `src/app.html` : l'application ; `src/fb-shim.js` : couche Firebase ; `src/config.js` : identifiants publics Firebase.
- `build.py` : assemble `index.html` (`python3 build.py`).
- `firestore.rules` : règles de sécurité à publier dans la console Firebase.
- `tests/` : tests navigateur (voir `tests/README.md`).
- `docs/ARCHITECTURE.md` : dossier technique (architecture, sécurité, limites, questions de revue).

Aucune donnée de l'association n'est dans ce dépôt : tout est dans Firestore, protégé par les règles.
