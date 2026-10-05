# Tests (Playwright, navigateur headless)

Prérequis : `npm i -g playwright` et un Chromium (ou `CHROMIUM=/chemin/vers/chromium`).

| Script | Ce qu'il vérifie |
|---|---|
| `shot3.js` | Parcours complet : joueurs, séance, match, incident, stats, résumé (captures dans `out/`) |
| `stress.js` | 15 matchs, ~500 actions aléatoires, écritures qui échouent 15 % du temps : aucune erreur, file d'attente de sauvegarde vidée |
| `cent.js` | Variante « match à 100 points » : 4 quart-temps enchaînés |
| `feat.js` | Chrono (démarrage auto, dernière minute, buzzer), confirmations technique/antisportive, journal corrigeable, image des stats |
| `quick.js` | Saisie en un tap, bande « passe de ? », remplacement banc→terrain, mode entraînement local |
| `draft.js` | Capitaines et draft en serpentin |
| `fix.js` | Correction des résultats sur une séance clôturée (fixture anonymisée) |
| `fbtest.js` | Couche Firebase simulée (`fake-firebase.js`) : connexion bureau, première installation, lien marqueur, saisie par le marqueur, consultation |
| `heap.js` | Mémoire : stabilité du tas JS sur 8 matchs |

Lancer un test : `node tests/shot3.js` (cible `src/app.html` par défaut, `APP=index.html` pour le site assemblé).
`fbtest.js` attend un serveur local sur `http://127.0.0.1:8099` servant le dossier racine (`python3 -m http.server 8099`).
Les fixtures (`fixture-*.json`) sont anonymisées : aucun nom réel, aucune donnée du bureau.
