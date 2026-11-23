# Hoops Stats — le mémo des règles

*Hoops Basket Association · mis à jour le 18 novembre 2026*

Ce mémo dit comment les stats sont calculées, pourquoi on a fait ces choix, et ce qu'il faut savoir pour faire vivre l'appli. Il sert à deux choses : répondre aux questions des joueurs, et permettre à quelqu'un de reprendre le projet sans tout redécouvrir.

La version courte, pour les joueurs, est aussi dans l'appli : onglet Stats, bouton « Comment c'est calculé ».

---

## 1. Le principe

- **La base garde les faits** : qui a marqué, qui a fait la passe, les fautes, qui était sur le terrain et combien de temps.
- **Le code fait les calculs** : note, classement, trophées, badges. Tout est recalculé à chaque affichage à partir des faits.
- Conséquence : si on change une règle, tout l'historique se recalcule tout seul. Rien n'est à corriger à la main.
- **Seules les décisions annoncées sont figées** dans la base : le joueur du mois, une fois proclamé, ne change plus.

On ne compte que ce qui se constate à la table de marque. Les tirs ratés, les rebonds et les interceptions ne sont saisis que les dimanches en « stats enrichies », à deux à la table (voir plus bas). Pas de contres ni de ballons perdus.

---

## 2. La note sur 10

C'est le chiffre central. Il sert au classement de la saison (le ladder), au MVP du jour et au joueur du mois.

Chaque part est notée sur 10, en comparant le joueur au meilleur de la période. La note est la somme des parts, chacune avec son poids.

### Sur la saison (et sur un mois)

| Part | Poids | Ce qu'elle mesure |
|---|---|---|
| Attaque : volume | 20 % | Total de points + 1,5 × passes décisives |
| Attaque : efficacité | 15 % | La même chose pour 10 minutes sur le terrain |
| Poids dans l'équipe | 20 % | Ce qu'il produit, rapporté aux points de son équipe, dimanche par dimanche |
| Défense | 10 % | Points encaissés par son équipe en 10 minutes quand il est sur le terrain |
| Victoires | 15 % | Part de matchs gagnés, au prorata du temps passé sur le terrain |
| Régularité | 20 % | Dimanches présents sur dimanches joués |

### Sur une séance

| Part | Poids |
|---|---|
| Attaque (points + 1,5 × passes du jour) | 35 % |
| Poids dans l'équipe | 25 % |
| Défense | 10 % |
| Victoires | 15 % |
| Régularité (10 pour tout le monde ce jour-là) | 15 % |

### Les détails qui comptent

- **Une passe vaut 1,5 point.** Elle crée un panier sans qu'on la voie au score.
- **L'efficacité à la minute** ne s'applique qu'à partir de 30 minutes chronométrées. En dessous, on revient au calcul par match.
- **Techniques et antisportives** : on retire 2 × leur nombre ÷ matchs joués. Une technique en 20 matchs coûte 0,1 point. Les fautes ordinaires ne comptent pas.
- **La défense est « prudente »** : tant qu'un joueur a peu de minutes, son chiffre est ramené vers la moyenne du groupe. Un bon dimanche isolé ne pèse pas autant que dix.
- **La note du jour** n'est donnée qu'à partir de 3 matchs joués.

### Qui est classé au ladder

Il faut avoir été présent **au moins un dimanche sur deux** et avoir joué un minimum de matchs (la moitié des matchs du joueur le plus présent, entre 3 et 10). Les autres apparaissent grisés, hors classement.

### Pourquoi ces poids

- On voulait un **classement de performance pour les joueurs réguliers** : d'où les 20 % de régularité.
- Le **volume** a été ajouté pour qu'un joueur efficace sur peu de minutes ne passe pas devant ceux qui portent leur équipe tous les dimanches.
- L'**efficacité à la minute** corrige la rotation : certains jouent 6 minutes par match, d'autres 8.
- La **défense** donne une place à ceux qui marquent peu mais font gagner.
- La **victoire** reste à 15 % : sur un dimanche, elle dépend beaucoup du tirage des équipes.

**Règle de conduite : on ne touche plus aux poids avant la 10e journée.** Chaque changement déplace des joueurs sans qu'ils aient joué, et le classement perd la confiance du groupe.

---

## 3. Les deux formules du dimanche

Le marqueur choisit la formule à l'étape « Équipes », avant de les former. L'appli conseille la bonne selon le nombre de présents.

**Rotation à 3 équipes** (16 présents et plus)
- Matchs à 12 points ou 9 minutes, le gagnant reste.
- 2 lancers francs à la 6e faute d'équipe, puis le compteur repart à zéro.

**Match à 100 points** (12 à 15 présents)
- 2 équipes, 4 quart-temps. Un quart-temps s'arrête quand une équipe atteint le palier : 25, 50 (mi-temps), 75, puis 100 (fin du match). Le score s'additionne d'un quart-temps à l'autre.
- Collective annoncée à la 5e faute d'équipe, puis 2 lancers francs à chaque faute à partir de la 6e, jusqu'à la fin du quart-temps. Les fautes d'équipe repartent à zéro à chaque quart-temps.
- Pas de temps limite. Le chrono sert seulement à compter le temps de jeu de chacun : il part à la première action et se met en pause avec ⏸.
- Le cinq de départ est demandé à chaque quart-temps.
- Pour les stats, chaque quart-temps compte comme un match (victoire, minutes, impact).
- Une séance lancée par erreur en rotation peut passer en match à 100 tant que seules deux équipes jouent : options « ⋯ » de la table de marque.

---

## 4. La table de marque sur PC et les stats enrichies

**Sur un écran large** (PC, à partir de 1200 pixels de large), la table passe en trois colonnes : une équipe de chaque côté, le score, le chrono et le journal au centre. Chaque joueur a ses boutons en accès direct : panier à 2, à 3, lancer réussi, lancer raté, faute. Le téléphone garde l'écran habituel.

Raccourcis clavier : **Espace** lance ou arrête le chrono, **Retour arrière** annule la dernière action.

**Les stats enrichies** se cochent au lancement de la séance (ou dans le menu ⋯ pendant le match). Elles sont prévues pour deux personnes à la table : une qui regarde et annonce, une qui saisit.

- **Tir raté** : un bouton « 2 » et un bouton « 3 » en pointillés à côté des paniers.
- **Rebond** : après chaque tir raté, et après le dernier lancer franc raté de la série (le second en général ; le seul quand le panier a été marqué sur la faute, « and one » ; jamais après une technique ou une antisportive, puisque le ballon est rendu), l'appli demande « Qui prend le rebond ? » et montre les dix joueurs sur le terrain. Un clic suffit : l'appli sait toute seule s'il est offensif ou défensif, selon l'équipe du joueur. Si on enchaîne sur une autre action, la question disparaît et le rebond n'est pas compté. Le tireur peut prendre son propre rebond (offensif).
- **Tir sorti ou airball** : sous la question du rebond, « Sorti · ballon à … » note quelle équipe récupère la remise en jeu. Le tir est ainsi « suivi » dans le rapport de table, sans rebond pour personne.
- **Contre** (niveau Complet) : sur un tir raté, « ⛔ Contré ? » dans la question du rebond, puis le contreur parmi les 5 défenseurs. La question du rebond revient ensuite. Le contre est affiché, il n'entre pas dans la note.
- **Interception** : dans la fiche du joueur (« ⋯ » ou clic sur son nom).

Ce qu'on en tire : le pourcentage de réussite au tir (à partir de 5 tirs sur un dimanche, 20 sur la saison), les rebonds offensifs et défensifs, les interceptions.

**Les garde-fous**
- Ces chiffres ne portent que sur les dimanches où le mode était activé. Les paniers des autres dimanches n'entrent pas dans le pourcentage.
- Trois niveaux de saisie, choisis au lancement et modifiables en séance : **Simple** (points, passes, fautes), **Tirs** (+ tirs ratés), **Complet** (+ rebonds, interceptions et contres). Dans les données : `rich` absent, `rich` + `richReb:false`, `rich` + `richReb:true`.
- Table PC : la ligne du joueur porte les paniers, les ratés, les lancers et la faute. Un clic sur le nom ouvre seulement le reste : technique, antisportive, remplacement, et au niveau Complet l'interception (« INT ») et le rebond oublié (« REB », offensif ou défensif selon l'équipe du dernier tir raté).
- Balles perdues (niveau Complet) : après une interception, l'appli demande à qui le ballon a été pris. Pour un marcher ou une passe dehors, bouton « BP » dans la fiche du joueur. Elles sont comptées et affichées, sans entrer dans la note.
- Sur grand écran, la table s'agrandit pour occuper la fenêtre (base 1366 × 740, jusqu'à × 2). Elle ne rétrécit jamais.
- Le niveau de saisie est noté sur chaque match (`lvl`). S'il change en cours de séance, l'adresse au tir ne porte que sur les matchs suivis, et le dimanche n'entre pas dans les moyennes de rebonds.
- Un compteur de saisie (paniers, ratés ; rebonds et vols au niveau Complet) s'affiche sous le score. Il alerte quand il y a moins de ratés que de paniers.
- Guidage des lancers (écran large) : une faute qui donne des lancers ouvre « qui tire ? », puis Réussi / Raté lancer par lancer. Un seul lancer si le panier a été marqué sur la faute (saisir le panier **avant** la faute). Un premier lancer saisi à la main fait proposer le second.
- Technique ou antisportive : 2 lancers pour l'adversaire, tireur au choix dans toute l'équipe, pas de rebond, possession rendue. Sur grand écran, « 2 lancers · qui tire ? » s'ouvre tout seul.
- Double technique ou antisportive (une de chaque côté sur la même action, saisies à moins de 15 s d'écart) : les fautes s'annulent, pas de lancers. L'appli le dit dans la confirmation de la seconde. La carafe reste due pour chaque technique.
- Un tir raté sur une faute ne se saisit pas : on saisit la faute, puis les lancers.
- Ils n'entrent pas dans la note cette saison : le classement ne doit pas dépendre de la qualité de la saisie du jour.
- Un tir raté oublié gonfle le pourcentage sans que le score le trahisse. À surveiller : sur un dimanche bien saisi, le groupe tourne en général entre 35 et 50 % de réussite.

**Pour s'entraîner** : `https://hoops-basket-asso.github.io/hba-hoops/?mode=test&demo=table` ouvre une séance fictive en cours. Rien n'est envoyé à l'association.

---

## 5. Les autres chiffres

- **Déf.** : points encaissés par l'équipe en 10 minutes quand le joueur est sur le terrain. Plus c'est bas, mieux c'est. Marqué « ≈ » sous une heure de jeu chronométrée. Sur un seul dimanche, c'est surtout un chiffre d'équipe ; il devient personnel au fil de la saison, quand les équipes se mélangent.
- **Impact** : écart de points de l'équipe par 10 minutes quand il joue, moins le même écart quand il est sur le banc. Fiable seulement avec au moins une heure sur le terrain et une heure sur le banc.
- **Lancers francs** : réussis sur tentés, et % de réussite. La carte « Lancers francs » classe par nombre de tentatives (qui va le plus sur la ligne) ; le plus adroit est désigné à partir de 10 tentés sur la saison. La fiche de chaque joueur montre d'où viennent ses points : paniers à 2, à 3, lancers.
- **Championnat** : 2 points par victoire, 1 par défaite, au prorata des minutes jouées dans chaque match.
- **Minutes** : comptées seulement sur les matchs où le cinq de départ ou les remplacements sont saisis. **Saisir le cinq de départ à chaque match est ce qui rend toutes ces stats justes.**
- **Duos** : deux joueurs dans la même équipe sur le même match. La comparaison « ensemble / séparés » demande 15 matchs ensemble et 10 séparés.
- **Combos passe → panier** : chaque passe décisive est rattachée au panier qui la précède. Affichés à partir de 3 passes entre deux joueurs.
- **Équipe du jour** : l'équipe au meilleur bilan du dimanche (% de victoires, puis victoires, puis écart de points). Pas d'équipe du jour en cas d'égalité parfaite.

---

## 6. Les distinctions

### Joueur du mois

- Meilleure note du mois.
- Il faut être présent à 60 % des dimanches du mois et avoir joué 12 matchs (3 par dimanche si le mois compte moins de 4 dimanches).
- Désigné à la fin du mois, puis **figé** : il ne change plus, même si la formule évolue.
- Octobre 2026 : Gilles S. (annoncé avant le passage à la note par minute).

### Trophées de la saison

Recalculés après chaque dimanche, remis en fin de saison.

| Trophée | Critère |
|---|---|
| 👑 MVP | N° 1 du ladder |
| 🎩 Westbrook | Meilleure part de paniers servis |
| 🎯 Curry | Le plus de paniers à 3 points |
| 🆓 Calderón | Meilleur % aux lancers francs (30 tentés minimum) |
| 🧱 Draymond | Meilleur impact (150 min jouées et 90 min sur le banc minimum) |
| 🔒 Le Verrou | Son équipe encaisse le moins (300 min chronométrées minimum) |
| 📅 A.C. Green | Le plus de dimanches de présence |
| 🏆 73-9 | Meilleur % de victoires (60 matchs minimum) |
| 🏆 Monsieur Dimanche | Le plus souvent dans l'équipe du jour |
| 🎖️ Champion de la saison | Premier du championnat |
| 🦾 Iron Man | Le plus de minutes sur le terrain |
| 🚀 Most Improved | Plus forte hausse de points par match entre les deux moitiés de saison |
| 🧊 Tim Duncan | Aucune technique ni sanction, 25 dimanches minimum |
| 🪑 Sixième homme | Meilleur joueur parmi ceux présents moins d'un dimanche sur deux |
| 🃏 Jokić | Meilleur passeur hors meneurs (10 passes minimum) |
| 🛰️ Brook Lopez | Le plus de paniers à 3 points parmi les intérieurs |

### Prix votés (prévus pour juin 2027)

- Deux prix : **fair-play** et **progrès de l'année**.
- Vote ouvert parmi les joueurs réguliers, on ne vote pas pour soi.
- Un vote par appareil. Le vote est confidentiel : on n'annonce que le gagnant, jamais le nombre de voix.
- Les règles Firebase sont déjà prêtes ; l'écran de vote reste à construire au printemps.

### Badges

Des paliers franchis dans un dimanche : gros match, série à 3 points, record personnel, plusieurs passes, invaincu… Ils sont là pour le plaisir et n'entrent dans aucun classement.

---

## 7. Les images à partager

- **Le résumé de la séance** : équipe du jour, MVP, leaders du jour, résultats, badges.
- **Le ladder** : n° 1, places 2 à 5, remontée de la semaine, un leader par catégorie.
- Rythme conseillé : le résumé le dimanche soir, le ladder le lundi. À partir de janvier, le ladder une semaine sur deux.
- Les deux images affichent la photo du joueur quand elle existe, ses initiales sinon.

---

## 8. Ce qu'il faut faire pour que ça marche

**Chaque dimanche**
- Saisir le cinq de départ de chaque match.
- Recharger l'appli sur le téléphone du marqueur avant de commencer.
- À la clôture, faire la sauvegarde JSON (l'appli la propose). C'est la seule vraie sauvegarde des faits.

**Qui peut faire quoi**
- **Les joueurs** consultent sans compte. « Je suis… » est mémorisé dans leur téléphone seulement.
- **Le marqueur** écrit dans la séance du jour avec son lien, valable jusqu'à 23h59.
- **Le bureau** se connecte par email : corrections, joueurs, photos, trésorerie, sanctions.
- Trésorerie, cotisations et sanctions ne sont visibles que du bureau.

**Les photos**
- Ajoutées par le bureau depuis la fiche du joueur, avec son accord.
- Réduites à 200 pixels sur le téléphone (environ 10 Ko). Retirables à tout moment.
- Elles sont visibles par toute personne qui a le lien de l'appli.

**Deux téléphones sur la même séance**
- L'appli fusionne match par match : la saisie de l'un et la correction de l'autre sont gardées.
- Si les deux modifient le même match au même moment, la plus récente l'emporte.

---

## 9. Pour celui ou celle qui reprendra le projet

- **Une seule appli officielle** : l'appli web, installable sur Android et iPhone depuis le navigateur.
- Code sur GitHub (`hoops-basket-asso/hba-hoops`). Tout est dans `src/app.html` ; `python3 build.py` produit `index.html`.
- Base : Firebase (Firestore). Les règles de sécurité sont dans `firestore.rules` et se publient à la main dans la console.
- Tests : dossier `tests/`, 30 scénarios automatiques (table de marque, stats, images, trésorerie, conflits entre appareils). **Tout changement du moteur doit passer la suite complète.**
- L'architecture technique est décrite dans `ARCHITECTURE.md`.
- Les poids de la note sont en tête du code (`NOTE_S` pour la saison, `NOTE_D` pour une séance). Les seuils des trophées sont dans `AWARDS` et `seasonAwardsRaw`.
- Les données réelles ne sont jamais dans le dépôt : il est public.

---

## 10. Ce qui reste fragile

- **Peu de données.** Après 4 dimanches, la défense, l'impact et les duos sont encore incertains. Ils deviennent parlants vers la 10e journée.
- **Un quart des matchs n'a pas de minutes saisies.** Les stats à la minute ne portent que sur les autres.
- **Pas de comptes joueurs.** N'importe qui peut choisir n'importe quel nom dans « Je suis… ». Sans gravité pour consulter, à garder en tête pour le vote.
- **Le projet repose sur peu de personnes.** Ce mémo, le dépôt et les tests sont là pour ça.

**Moyennes par dimanche.** La fiche du joueur et la carte « Ma saison » donnent les points, passes et victoires par dimanche joué. Rebonds, interceptions et balles perdues sont rapportés aux seuls dimanches en saisie complète. Ces moyennes sont informatives et n'entrent pas dans la note.

**MVP annoncé.** Quand le MVP du jour a été annoncé et qu'une correction ultérieure des données change le classement, le bureau peut maintenir le titre (champ `mvp` de la séance). Le joueur garde le titre de MVP du jour, avec la mention « Annoncé le jour même ». Les notes restent celles du calcul et le ladder de saison n'est pas touché.

**Stats avancées : affichage.** Dans la vue d'une séance, la carte « Stats avancées » est visible par tous, avec la liste des matchs suivis en saisie complète (« 4 matchs sur 9 »). Dans les vues mois et saison, elle n'apparaît aux joueurs qu'à partir de 3 dimanches comptant au moins un match suivi en complet. Les colonnes « Tirs % » et « Reb. » du tableau suivent la même règle. Le bureau voit tout, tout de suite, avec la mention de ce seuil. Le bureau dispose aussi d'un « Rapport de table » par séance : niveau tenu par match, rythme de saisie, tirs ratés suivis d'un rebond, passes par panier.
