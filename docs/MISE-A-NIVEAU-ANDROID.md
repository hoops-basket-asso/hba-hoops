# Hoops Stats — note de mise à niveau pour l'appli Android

État au 22 novembre 2026. Cette note liste ce qui a changé dans l'appli web depuis le 12 novembre, et ce qu'une autre appli doit respecter pour lire et écrire la même base sans écart.

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
| 22/11 | Niveau de saisie noté sur chaque match : `lvl` | § 2.2 |
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
| `out` | — | — | Sortie de balle |
| `miss` | `pid`, `v` (2 ou 3) | 18/11 | Tir raté |
| `reb` | `pid`, `off` (booléen) | 18/11 | Rebond. `team` = équipe du rebondeur |
| `stl` | `pid` | 18/11 | Interception |
| `to` | `pid`, `stl` (optionnel) | 18/11 | Balle perdue. `stl: true` si elle suit une interception |

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

### 3.5 Moyennes par dimanche

Points, passes et victoires sont divisés par le nombre de dimanches joués (au moins un match). Rebonds, interceptions et balles perdues sont divisés par le nombre de dimanches au niveau **Complet** seulement.

### 3.6 Ce qui n'entre pas dans la note

Tirs ratés, rebonds, interceptions et balles perdues sont affichés mais **n'entrent pas dans la note** pour l'instant. Décision du bureau : pas de changement de pondération avant la 10e journée, et pas avant quatre séances au niveau Complet.

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
3. **Le critère** : pour une même séance, les compteurs du § 2.4 sont égaux joueur par joueur, et le score de chaque match aussi.

Tant que ce critère n'est pas tenu, l'appli Android ne doit pas écrire dans une vraie séance.

---

## 8. Tenue à jour

Chaque changement de format de données ou de règle de calcul sera ajouté en tête du § 1 de cette note, avec sa date.
