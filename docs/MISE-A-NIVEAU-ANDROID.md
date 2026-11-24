# Hoops Stats — note de mise à niveau pour l'appli Android

État au 23 novembre 2026, après lecture des dépôts `hba-android` et `hba-ios`. Cette note liste ce qui a changé dans l'appli web depuis le 12 novembre, et ce qu'une autre appli doit respecter pour lire et écrire la même base sans écart.

**La règle d'or.** Les deux applis partagent la même base Firebase (`hba-hoops`). Une séance saisie dans l'une doit donner exactement les mêmes chiffres dans l'autre. On ne vise pas le même code, on vise les mêmes données et les mêmes calculs.

Références dans ce dépôt :

- `REGLES.md` : toutes les règles de jeu et de calcul, en clair.
- `docs/ARCHITECTURE.md` : l'architecture et la sécurité.
- `firestore.rules` : les règles publiées dans Firebase.
- `src/app.html` : le code. Le moteur de match est la fonction `matchStateRaw`.
- `tests/` : 30 scénarios rejoués à chaque livraison.

---

## 1. Ce qui a changé, par ordre d'impact

### A. Changements de données (à reprendre en priorité)

| Date | Changement | Où |
|---|---|---|
| 23/11 | Nouvelle action `blk` (contre, saisi par la fiche du joueur) ; `out` peut porter `miss: true` (tir raté sorti, sans `team`) ; champs `noFt` / `ftFix` sur une faute (lancers volontairement non tirés / rattrapés en fin de match) | § 2.3 |
| 24/11 | Fiche joueur : champs facultatifs `color` et `motif` sur le joueur ; `skin` dans `config/main` (couleur de la saison). Purement visuels, à conserver tels quels à l'écriture. Valeurs : voir `PCOLORS`, `MOTIFS`, `SKINS` dans `src/app.html` | § 2 |
| 23/11 | Lancers après technique / antisportive : 2 lancers, tireur au choix ; double faute (une de chaque côté) = pas de lancers | § 3.4 |
| 22/11 | MVP officiel d'une séance : `mvp` (id du joueur) sur la séance, prioritaire sur le calcul pour le titre du jour | § 2.1 |
| 22/11 | Niveau de saisie noté sur chaque match : `lvl` | § 2.2 |
| 21/11 | Chrono d'attaque partagé : `shotDuration`, `shotOrigin`, `lastMinute`, `shotExpired` sur le match | § 9.1 |
| 21/11 | Signalements d'incident dans une collection privée `incidents` (à venir côté web) | § 9.2 |
| 18/11 | Niveaux de saisie : `rich` et `richReb` sur la séance | § 2.1 |
| 18/11 | Nouvelles actions : `miss`, `reb`, `stl`, `to` | § 2.3 |
| 16/11 | Match à 100 : `quarter`, `cum`, `target`, `foulRule` sur chaque quart-temps | § 2.2 |
| 18/11 | Commentaire d'audit sur un règlement : `note`, `noteAt`, `noteBy` | § 2.5 |
| 18/11 | Suppression d'une séance par le bureau | § 2.6 |
| 12/11 | Fusion entre appareils : `rev` par match, `delM` sur la séance | § 4 |
| 13/11 | Lien marqueur : le code ne voyage plus dans la séance (`scorerClaims`) | § 5 |

### B. Changements de règles de calcul

| Date | Changement | Où |
|---|---|---|
| 18/11 | Rebond après lancer franc : seulement sur le dernier lancer de la série | § 3.3 |
| 18/11 | « And one » : un seul lancer quand le panier est marqué sur la faute | § 3.3 |
| 16/11 | Match à 100 : fautes d'équipe remises à zéro à chaque quart-temps, 2 lancers à partir de la 6e | § 3.2 |
| 16/11 | Match à 100 : le chrono compte le temps de jeu, sans limite | § 3.2 |
| 19/11 | Moyennes par dimanche joué | § 3.5 |
| 12/11 | Note : attaque par 10 minutes, défense 10 %, victoires au prorata | `REGLES.md` |

### C. Changements d'écran (libres côté Android)

- Table de marque en trois colonnes sur grand écran, qui grossit avec la fenêtre.
- Boutons directs sur la ligne du joueur : +2, +3, 2 raté, 3 raté, +1, LF raté, F.
- Clic sur le nom : seulement ce qui n'est pas sur la ligne (technique, antisportive, remplacement ; INT, BP, REB au niveau Complet).
- Questions qui s'ouvrent seules : passeur, rebond, « ballon pris à qui ? », lancers. Aucune ne bloque la saisie.
- Compteur de saisie sous le score, avec alerte s'il y a moins de tirs ratés que de paniers.
- Accueil joueur : carte « Ma saison », dernier dimanche, podium.

---

## 2. Format des données

### 2.1 La séance (`sessions/{id}`)

Champs ajoutés ou à connaître :

| Champ | Valeurs | Sens |
|---|---|---|
| `format` | `"rotation"` ou `"cent"` | Rotation à 3 ou 4 équipes, ou match à 100 points |
| `rich` | `true` ou absent | Tirs ratés saisis |
| `richReb` | `true` / `false` | Rebonds, interceptions et balles perdues saisis |
| `delM` | `{ idMatch: horodatage }` | Matchs supprimés (voir § 4) |
| `updatedAt` | horodatage (ms) | Dernière écriture |

Les trois niveaux de saisie :

| Niveau | `rich` | `richReb` |
|---|---|---|
| Simple | absent | absent |
| Tirs | `true` | `false` |
| Complet | `true` | `true` |

**MVP officiel (`mvp`).** Si la séance porte `mvp`, ce joueur est le MVP du jour partout (classement du jour, résumé, accueil), même si un autre a une meilleure note. Les notes ne changent pas. Sans `mvp`, le calcul décide.

Attention : une séance avec `rich: true` et **sans** `richReb` est lue comme **Complet** (compatibilité avec les premières séances enrichies). Écrivez toujours `richReb` explicitement.

Le niveau peut changer en cours de séance. Il faut alors recalculer les stats.

### 2.2 Le match (élément de `matches[]`)

Champs communs : `n`, `home`, `away`, `lineup`, `roster`, `events`, `status` (`live` / `done`), `winner`, `elapsedMs`, `running`, `startedAt`, `createdAt`, `endedAt`, `endReason`, `rev`.

En match à 100, chaque quart-temps est un match à part entière, avec en plus :

| Champ | Valeur | Sens |
|---|---|---|
| `quarter` | 1 à 4 | Numéro du quart-temps |
| `cum` | `{ A: n, B: n }` | Points de chaque équipe **avant** ce quart-temps |
| `target` | `25 × quarter` | Palier cumulé à atteindre (25, 50, 75, 100) |
| `foulRule` | `"continuous"` | Voir § 3.2 |

Le quart-temps se termine quand `cum[équipe] + score du quart ≥ target`. Le vainqueur du match à 100 est celui qui atteint 100. Les équipes sont toujours `A` et `B`.

**Niveau de saisie du match (`lvl`).** Depuis le 22/11, chaque match porte `lvl` : 0 pour Simple, 1 pour Tirs, 2 pour Complet. Le niveau peut changer en cours de séance, donc c'est celui du match qui compte. Sans `lvl` (anciens matchs), le niveau de la séance s'applique. Règles de calcul : un tir raté n'est compté que si `lvl ≥ 1` ; un panier ne compte comme tir tenté que si `lvl ≥ 1` ; rebonds, interceptions et balles perdues ne sont comptés que si `lvl = 2`. Un dimanche n'entre dans les moyennes de rebonds par dimanche que si tous ses matchs sont à `lvl = 2`.

Les champs dont le nom commence par `_` sont des mémos locaux. Ils ne sont jamais écrits dans la base.

### 2.3 Les actions (`events[]`)

Chaque action porte `type`, `team`, `t` (horodatage en ms) et `el` (temps de jeu écoulé en ms au moment de l'action).

| `type` | Champs propres | Depuis | Sens |
|---|---|---|---|
| `pt` | `pid`, `v` (2 ou 3) | — | Panier marqué |
| `ast` | `pid` | — | Passe décisive, écrite juste après le `pt` |
| `ft` | `pid`, `made` (booléen) | — | Lancer franc |
| `foul` | `pid` | — | Faute personnelle |
| `tech` | `pid` | — | Faute technique |
| `uns` | `pid` | — | Faute antisportive |
| `sub` | `out`, `in` | — | Remplacement |
| `out` | `miss` (optionnel) | — | Sortie de balle. `team` = équipe qui remet en jeu. Depuis le 23/11, `miss: true` quand elle suit un tir raté (pas de rebond) ; `team` est alors absent |
| `miss` | `pid`, `v` (2 ou 3) | 18/11 | Tir raté |
| `reb` | `pid`, `off` (booléen) | 18/11 | Rebond. `team` = équipe du rebondeur |
| `stl` | `pid` | 18/11 | Interception |
| `to` | `pid`, `stl` (optionnel) | 18/11 | Balle perdue. `stl: true` si elle suit une interception |
| `blk` | `pid` | 23/11 | Contre. Écrit après le `miss` contré (souvent avant le `reb`, pas toujours). `team` = équipe du contreur |
| `foul`, `tech`, `uns` | `noFt`, `ftFix` (optionnels) | 23/11 | `noFt` : la table a choisi « Pas de lancer ». `ftFix` : lancers saisis en rattrapage à la fin du match (ils sont en fin de journal) |

Règles d'écriture :

- `reb.off` vaut `true` si le rebondeur est dans l'équipe du tireur, `false` sinon. L'appli le déduit, la table ne le choisit pas.
- Un tir raté **sur une faute** ne s'écrit pas : on écrit la faute, puis les lancers.
- Après une interception, la balle perdue s'écrit comme une action `to` à part, pour le joueur adverse.

Exemple d'une séquence au niveau Complet :

```json
[
  {"type":"miss","team":"A","pid":"p12","v":3,"t":1795000000000,"el":61000},
  {"type":"reb","team":"B","pid":"p07","off":false,"t":1795000002000,"el":63000},
  {"type":"stl","team":"A","pid":"p03","t":1795000009000,"el":70000},
  {"type":"to","team":"B","pid":"p07","stl":true,"t":1795000010000,"el":71000},
  {"type":"pt","team":"A","pid":"p03","v":2,"t":1795000014000,"el":75000},
  {"type":"ast","team":"A","pid":"p12","t":1795000015000,"el":76000}
]
```

### 2.4 Les compteurs par joueur

Le moteur produit par joueur : `pts`, `fg2`, `fg3`, `fta`, `ftm`, `pf`, `tech`, `uns`, `pm`, `ast`, `onFor`, `onAg`, et depuis le 18/11 :

| Compteur | Calcul |
|---|---|
| `a2`, `a3` | Tirs tentés à 2 et à 3 (réussis + ratés) |
| `k2`, `k3` | Tirs réussis à 2 et à 3 |
| `orb`, `drb` | Rebonds offensifs et défensifs |
| `stl` | Interceptions |
| `tov` | Balles perdues |
| `blk` | Contres (niveau Complet, depuis le 23/11) |

Point important : `a2`, `a3`, `k2`, `k3` ne sont incrémentés par un `pt` **que si la séance a `rich: true`**. Sinon ils restent à zéro. Le pourcentage au tir ne se calcule donc que sur les séances enrichies, jamais sur l'historique.

### 2.5 Commentaire d'audit sur un règlement (bureau)

Dans le document des règlements d'une séance, l'entrée d'un joueur peut porter `note` (240 caractères au plus), `noteAt` (horodatage) et `noteBy` (début de l'adresse du membre du bureau). Le commentaire peut être posé avec ou sans confirmation du règlement.

### 2.6 Suppression d'une séance

Le bureau peut supprimer une séance en cours ou clôturée : le document `sessions/{id}` est effacé. Pour une séance clôturée ou de 30 actions et plus, l'appli web exige de taper le mot SUPPRIMER. Une appli tierce doit prévoir qu'une séance disparaisse.

---

## 3. Règles de calcul à reproduire

### 3.1 Formule rotation

Inchangée : 12 points ou 9 minutes (réglages `config.target`, durée). Les fautes d'équipe reviennent à zéro quand la limite est atteinte, et donnent 2 lancers.

### 3.2 Match à 100 (`foulRule: "continuous"`)

- Les fautes d'équipe **ne reviennent pas à zéro** pendant le quart-temps. Elles repartent de zéro au quart suivant, puisque c'est un nouveau match.
- Limite : `config.teamFoulLimit`, 6 par défaut.
- À la 5e faute : annonce « collective ». À partir de la 6e : 2 lancers à chaque faute.
- Le chrono **monte**. Il n'y a pas de limite de temps. Il sert au temps de jeu des joueurs.
- Le chrono démarre seul à la première action du quart-temps (sauf `out` et `sub`).
- Le cinq de départ est demandé à chaque quart-temps. Par défaut, c'est celui de la fin du quart précédent.
- Pour les stats (matchs joués, victoires), chaque quart-temps compte comme un match.

### 3.3 Rebond après lancers francs

La question du rebond ne se pose qu'au niveau Complet, après un lancer **raté**, et seulement si c'est le dernier de la série.

1. Compter les lancers consécutifs du même joueur en fin de liste : `c`.
2. Regarder l'action juste avant la série (en sautant les `ast`). Si c'est `tech` ou `uns` : pas de rebond.
3. C'est un « and one » si, à moins de 8 secondes d'écart :
   - une faute adverse suit un panier du tireur, ou
   - un panier du tireur suit une faute adverse.
4. `need` = 1 pour un « and one », 2 sinon.
5. Rebond possible si `c ≥ need` et `(c − need)` est pair.

Code de référence : fonction `ftReb` dans `src/app.html`.

### 3.4 Guidage des lancers (écran, facultatif)

Sur grand écran, une faute qui donne des lancers ouvre « qui tire ? », puis Réussi / Raté lancer par lancer. C'est une aide de saisie. Elle n'écrit rien d'autre que des actions `ft` normales.

Depuis le 23/11 : une technique ou une antisportive ouvre aussi « 2 lancers · qui tire ? » (tireur au choix dans toute l'équipe, sans rebond). Si l'action juste avant est une technique ou une antisportive de l'autre équipe, saisie il y a moins de 15 s, les deux fautes s'annulent : pas de lancers (fonction `dblFoul`).

### 3.5 Moyennes par dimanche

Points, passes et victoires sont divisés par le nombre de dimanches joués (au moins un match). Rebonds, interceptions et balles perdues sont divisés par le nombre de dimanches au niveau **Complet** seulement.

### 3.6 Ce qui n'entre pas dans la note

Tirs ratés, rebonds, interceptions, balles perdues et contres sont affichés mais **n'entrent pas dans la note** pour l'instant. Décision du bureau : pas de changement de pondération avant la 10e journée, et pas avant quatre séances au niveau Complet.

---

## 4. Deux appareils sur la même séance

À respecter par toute appli qui **écrit** dans `sessions`.

- Identifiant d'un match : `"c" + createdAt`, ou `"n" + n` pour les vieux matchs sans `createdAt`.
- `rev` : horodatage posé sur un match à chaque fois que son contenu change.
- `delM` : pour chaque match supprimé, l'horodatage de la suppression.
- Fusion : pour chaque match, la version au `rev` le plus récent gagne. Un match supprimé reste supprimé, sauf s'il a été modifié après la suppression.
- `corrections` : journal des corrections, fusionné par ajout.

Conséquence : deux appareils peuvent travailler sur deux matchs différents. **Sur le même match en cours, le dernier qui écrit gagne.** Un seul appareil saisit un match.

Une appli qui écrit sans mettre à jour `rev` verra ses modifications écrasées. Une appli qui réécrit tout le tableau `matches` sans fusionner écrasera celles des autres.

Code de référence : `mergeSession`, `stampMatches`, `saveSession`.

---

## 5. Sécurité et droits

| Collection | Lecture | Écriture |
|---|---|---|
| `players`, `sessions`, `config/main` | Tout le monde | Bureau (et marqueur pour sa séance) |
| `scorerTokens` | Un code connu ; liste réservée au bureau | Bureau |
| `scorerClaims/{uid}` | Son propre document | Son propre document (`token`, `at`) |
| `sanctions`, `treasury`, `payments`, `config/bureau` | Bureau | Bureau |

- Depuis le 17/11, l'ancien mode du lien marqueur (code stocké dans la séance) est retiré des règles. Le marqueur écrit sa fiche `scorerClaims/{uid}`, et les règles vérifient le code à partir d'elle.
- Les règles ne limitent pas les champs écrits dans une séance. Une erreur de format n'est donc pas refusée par la base : elle se voit dans les stats.

---

## 6. Le visuel

Rien n'oblige les deux applis à être identiques à l'écran. Une appli Android a ses propres codes (retour, gestes, barres). Voici la charte de l'appli web, pour rester cohérent.

**Polices** : Barlow Condensed (titres, chiffres) et Barlow (texte). Chiffres à largeur fixe dans les tableaux.

**Couleurs**

| Rôle | Clair | Sombre |
|---|---|---|
| Fond | `#F7F4EE` | `#0D1015` |
| Carte | `#FFFFFF` | `#161A21` |
| Texte | `#151515` | `#F4F1EA` |
| Texte secondaire | `#6B6B70` | `#8B94A3` |
| Trait | `#E6E1D6` | `#272D38` |
| Accent (orange) | `#E4692B` | `#E4692B` |
| Bon / alerte / mauvais | `#1E9A4E` / `#B54708` / `#C8241E` | `#2ED47A` / `#F4B740` / `#F2545B` |

Couleurs du club : vert `#01A54E`, rouge `#EE312B`, jaune `#FABF25`, bleu `#4156A7`.

**Formes** : coins arrondis de 12 px, cartes sans bordure en clair avec une ombre légère, avec un trait fin en sombre.

**À venir** : les gris secondaires et l'orange utilisé pour le texte vont être foncés, pour le contraste. Les valeurs ci-dessus changeront. Elles seront mises à jour ici.

---

## 7. Comment vérifier que les deux applis sont alignées

1. **La démo de la table** (joueurs fictifs, rien n'est envoyé) :
   - niveau Tirs : `https://hoops-basket-asso.github.io/hba-hoops/?mode=test&demo=table`
   - niveau Complet : `https://hoops-basket-asso.github.io/hba-hoops/?mode=test&demo=table&niveau=complet`
2. **Le jeu d'essai** : `tests/fixture-export.json` est une base fictive complète. Chargée dans les deux applis, elle doit donner le même ladder, les mêmes notes et les mêmes stats par joueur.
   `tests/fixture-2211.json` (ajouté le 23/11) est la séance réelle du 22/11, anonymisée : 18 « Joueur NN », 9 matchs, niveaux de saisie par match (4 en Complet), tirs ratés, rebonds, interceptions, balles perdues, lancers, techniques, MVP officiel. Ni sanctions, ni paiements, ni emails. Repères attendus (mis à jour le 24/11 : au match 2, panier de Joueur 09 sur passe de Joueur 03, et non l'inverse) : 9 matchs ; Joueur 10 à 21 points ; Joueur 03 à 19 points et 2 passes ; Joueur 09 à 13 points et 6 passes ; Joueur 10 à 6/8 aux tirs suivis ; MVP officiel = Joueur 10 ; la vérification de fin de match ne signale que le match 7.
3. **Le critère** : pour une même séance, les compteurs du § 2.4 sont égaux joueur par joueur, et le score de chaque match aussi.

Tant que ce critère n'est pas tenu, l'appli Android ne doit pas écrire dans une vraie séance.

---

## 8. Tenue à jour

Chaque changement de format de données ou de règle de calcul sera ajouté en tête du § 1 de cette note, avec sa date.

---

## 9. Ce que les applis natives apportent au contrat commun

Lecture des dépôts `hba-android` et `hba-ios` du 21 novembre. L'appli web reprend ces points pour que les trois applis écrivent la même chose.

### 9.1 Chrono d'attaque partagé (rotation, dernière minute)

Le chrono d'attaque suit le temps de jeu du match, pauses comprises. Il est enregistré dans le match, donc visible à l'identique sur tous les appareils.

| Champ du match | Valeur | Sens |
|---|---|---|
| `shotDuration` | millisecondes | Durée réglée (20 000 ou 14 000) |
| `shotOrigin` | millisecondes | Temps de jeu écoulé au moment du réglage |
| `lastMinute` | booléen | Vrai dès qu'une commande ou une action a remplacé les 20 s automatiques |
| `shotExpired` | booléen | Remis à faux à chaque réglage |
| `shotActionID` | texte | Reçu de la dernière commande (applis natives) |

Calcul du temps restant, identique partout :

1. Rien en match à 100, sur un match terminé, ou hors de la dernière minute.
2. Si `shotDuration` et `shotOrigin` existent : `shotDuration − (écoulé − shotOrigin)`, borné à zéro.
3. Sinon, si `lastMinute` est vrai : pas de chrono d'attaque (il a été arrêté).
4. Sinon : 20 s automatiques depuis l'entrée dans la dernière minute.

L'appli web applique ce calcul et écrit ces champs à partir de la livraison du 23 novembre. Elle le vérifie sur les douze états de référence du dépôt `hba-ios` (`tests/attack.js`, `tests/contrat/attack-clock.json`).

**Un écart à trancher.** L'appli web remet 20 s sur un panier, une faute, une technique, une antisportive **et une sortie de balle** (`out`). Les applis natives ne le font pas sur la sortie de balle.

### 9.2 Signalements d'incident privés

Aujourd'hui, l'appli web range les signalements dans la séance, qui est lisible par tous. Les applis natives les rangent dans une collection réservée au bureau. C'est le bon choix, et l'appli web va le reprendre.

Document `incidents/{id}` : `id`, `sid` (séance), `date`, `pid`, `kind` (`contestation`, `blocage`, `insulte`, `menace`, `bagarre`, `autre`), `note` (2 000 caractères au plus), `matchN`, `t`, `status` (`open` au dépôt), `reportedBy`, puis `sanctionId` et `reviewedAt` au traitement.

Cela demande trois choses, dans cet ordre : de nouvelles règles Firebase publiées par le bureau, le déplacement des anciens signalements, puis la bascule de l'appli web. Tant que les règles ne sont pas publiées, les écritures dans `incidents` sont refusées par la base.

### 9.3 Champs ajoutés par les applis natives

Ils sont conservés tels quels par l'appli web, qui ne les lit pas.

- Sur une action : `eventId` (identifiant unique, pour ne pas la doubler après une réponse perdue) et `source` (`android` ou `ios`).
- Sur la séance : `nativeLaunchID` (reçu de lancement).

### 9.4 Écarts relevés dans le code natif

| Sujet | Appli web | Applis natives au 21/11 | À faire |
|---|---|---|---|
| Niveaux de saisie, tirs ratés, rebonds, interceptions, balles perdues | En place (§ 2) | Absents | Reprendre § 2 et § 3 |
| Chrono en match à 100 | Démarre seul à la première action, et compte le temps de jeu | Ne démarre pas à la première action | Aligner : sans temps de jeu, la note par 10 minutes est faussée |
| Cinq de départ en match à 100 | Redemandé à chaque quart-temps | Reconduit d'office au quart suivant | Acceptable si les remplacements sont bien saisis |
| Fin d'un quart-temps | Proposée à la table, puis validée | Écrite d'office quand le palier est atteint | Acceptable : le résultat enregistré est le même |
| Signalements | Dans la séance | Collection privée | L'appli web s'aligne (§ 9.2) |

### 9.5 Pour travailler ensemble

- Les fichiers `docs/FEATURE_PARITY.md`, `docs/ANDROID_FOUNDATION.md` et `docs/PRIVATE_DATA_ROLLOUT.md`, cités dans les deux dépôts natifs, n'y sont pas déposés. Ils seraient utiles ici.
- Toute modification de l'appli web faite de votre côté est la bienvenue sous forme de proposition (« pull request ») sur ce dépôt. Elle sera relue, testée sur les 31 scénarios, puis intégrée.
- Tout champ nouveau, d'un côté comme de l'autre, s'écrit d'abord dans cette note.

