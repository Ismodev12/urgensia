# 🎓 Guide de soutenance — URGENSIA

> Ton fil conducteur, pas à pas : **ce que tu dis** (script) + **ce que tu fais** (slide / action / démo) à chaque étape.
> Durée cible : **~15 min de présentation + ~6 min de démo + questions**. Adapte selon le temps imposé.

---

## ✅ 0. À préparer AVANT d'entrer (checklist)

- [ ] **Lance tout à l'avance** : base de données, backend, frontend — vérifie que ça marche 10 min avant.
- [ ] **Pré-remplis la file** : enregistre **3–4 patients de démo** dans différents états (2 en attente, 1 en cours) pour que la file ait l'air vivante.
- [ ] **Ouvre les onglets dans l'ordre** : (1) page d'accueil, (2) connexion, (3) dashboard infirmier, (4) dashboard médecin, (5) dashboard admin, (6) page de suivi patient avec un code déjà saisi.
- [ ] **Un 2ᵉ écran/téléphone** pour montrer la page patient côté « usager » pendant que tu agis côté soignant (effet « waouh » du temps réel).
- [ ] **Plan B** : une **vidéo de secours** (screen-record) + des **captures d'écran** au cas où le live plante ou le wifi coupe.
- [ ] **Comptes de démo** notés sur un papier : infirmier, médecin, admin.
- [ ] **Slides** prêtes (trame proposée en fin de document), eau, montre/chrono visible.

---

## ⏱️ Plan minuté

| # | Section | Durée | But |
|---|---|---|---|
| 1 | Accroche | 1 min | Capter l'attention |
| 2 | Contexte & problème | 2 min | Justifier le projet |
| 3 | Objectifs | 1 min | Ce qu'on veut résoudre |
| 4 | La solution (vue d'ensemble) | 2 min | Présenter URGENSIA |
| 5 | Le cœur : moteur de triage MTS | 2 min | Montrer l'intelligence |
| 6 | Architecture technique | 1,5 min | Crédibilité technique |
| 7 | **DÉMO live** | 6 min | Prouver que ça marche |
| 8 | Résultats & valeur | 1,5 min | L'impact |
| 9 | Difficultés & perspectives | 1,5 min | Recul & vision |
| 10 | Conclusion | 1 min | Marquer les esprits |

---

## 1. 🎬 Accroche (1 min)

**Ce que tu fais :** slide de titre (URGENSIA + logo). Tu regardes le jury, tu respires, tu souris.

**Ce que tu dis (exemple) :**
> « Bonjour, membres du jury. Imaginez un service d'urgences bondé. Un patient arrive avec une douleur à la poitrine ; à côté, quelqu'un avec une simple fièvre. Qui doit passer en premier ? Aujourd'hui, dans beaucoup d'hôpitaux, cette décision se prend de tête, à la file, parfois avec des minutes précieuses perdues. Et aux urgences, **une minute peut faire la différence entre la vie et la mort**. C'est ce problème que mon projet, **URGENSIA**, s'attaque à résoudre. »

---

## 2. 🔍 Contexte & problématique (2 min)

**Ce que tu fais :** slide « Le problème » avec 3–4 points clés.

**Ce que tu dis :**
> « Dans nos hôpitaux, le tri des urgences (le *triage*) est souvent **manuel et subjectif** : il dépend de l'expérience et de la fatigue du soignant. Cela pose quatre problèmes :
> 1. des **retards dangereux** pour les cas graves mal repérés ;
> 2. une **file d'attente désorganisée**, source de tensions ;
> 3. le **patient est dans le flou** : il ne sait ni combien de temps attendre, ni où aller ;
> 4. l'hôpital **n'a aucune donnée fiable** pour piloter son activité.
>
> Il fallait donc **standardiser, objectiver et fluidifier** ce processus. »

---

## 3. 🎯 Objectifs (1 min)

**Ce que tu fais :** slide « Objectifs ».

**Ce que tu dis :**
> « URGENSIA poursuit quatre objectifs :
> – **standardiser** le triage grâce à un protocole médical international, le *Manchester Triage System* ;
> – **prioriser automatiquement et objectivement** chaque patient ;
> – **guider le patient** en temps réel : sa position dans la file et son orientation ;
> – **fournir aux responsables** des statistiques et des rapports exploitables. »

---

## 4. 🧩 La solution — vue d'ensemble (2 min)

**Ce que tu fais :** slide « Workflow » avec les acteurs et le parcours (flèches).

**Ce que tu dis :**
> « URGENSIA est une **application web** qui accompagne tout le parcours du patient aux urgences. Elle fait intervenir quatre acteurs :
> – le **citoyen / patient**, qui **suit son passage en temps réel**, sans créer de compte ;
> – l'**infirmier d'accueil-triage**, qui enregistre le patient et réalise le triage ;
> – le **médecin**, qui prend en charge selon la priorité ;
> – l'**administrateur**, qui gère les comptes, les services et supervise l'activité.
>
> Le parcours est simple : **arrivée → triage → priorité calculée → orientation → prise en charge → suivi temps réel**. »

---

## 5. 🧠 Le cœur : le moteur de triage (2 min)

> C'est le moment où tu montres **l'intelligence** de la solution — insiste dessus.

**Ce que tu fais :** slide avec l'échelle Manchester (5 niveaux colorés) + la logique d'orientation.

**Ce que tu dis :**
> « Le cœur d'URGENSIA, c'est son **moteur de triage**. À partir des **symptômes** et des **constantes vitales** (température, tension, saturation…), il calcule **objectivement** un niveau de priorité sur l'échelle Manchester, de 1 à 5 :
> **1 = Critique** (immédiat), **2 = Très urgent**, **3 = Urgent**, **4 = Standard**, **5 = Non urgent**.
>
> Mais il va plus loin : il **oriente vers le bon service** selon le symptôme dominant — une douleur thoracique part en **Cardiologie**, des convulsions en **Neurologie**, un enfant en **Pédiatrie**, une urgence vitale en **Réanimation**. Le tout **en une fraction de seconde**, et surtout **sans jamais remplacer le jugement du soignant** : c'est une **aide à la décision**. »

*(Astuce : tu peux ouvrir le fichier `explication.md` du projet si le jury veut le détail de la logique.)*

---

## 6. 🏗️ Architecture technique (1,5 min)

**Ce que tu fais :** slide « Architecture » (schéma front / back / base + temps réel).

**Ce que tu dis :**
> « Techniquement, l'application repose sur une architecture moderne **client-serveur** :
> – un **frontend** en **React** (avec Vite et Tailwind CSS) pour une interface rapide et responsive ;
> – un **backend** en **Node.js / Express** exposant une **API REST** ;
> – une base de données **PostgreSQL** ;
> – et surtout du **temps réel** via **WebSocket (Socket.io)** : la file et les notifications se mettent à jour instantanément.
>
> Côté sécurité : **authentification par jeton JWT**, **mots de passe chiffrés (bcrypt)**, **gestion des rôles**, et un **journal d'audit**. L'application est **déployée en ligne** (frontend sur Netlify, backend et base sur Render). »

---

## 7. 🎥 DÉMONSTRATION LIVE (≈ 6 min) — LE moment fort

> Narre chaque clic. Va **doucement**. Si possible, garde la page patient visible sur un 2ᵉ écran pour montrer le temps réel.

**Ce que tu dis en intro :**
> « Passons à une démonstration concrète, en suivant un patient de A à Z. »

**Chorégraphie :**

1. **Page d'accueil** *(15 s)* — « Voici la vitrine publique et le point d'entrée. »
2. **Connexion infirmier** → dashboard *(15 s)* — « Je me connecte en tant qu'infirmier d'accueil-triage. Voici son tableau de bord : file du jour, cas critiques, statistiques temps réel. »
3. **Nouveau patient** *(1,5 min)* — clique « Nouveau patient » et remplis le formulaire en 4 étapes :
   - **Identité** (nom, âge, sexe) ;
   - **Constantes vitales** (mets par ex. une saturation basse ou une tension anormale) ;
   - **Symptômes** (coche « Douleur thoracique ») ;
   - « **Évaluer le patient** ».
   > « Je saisis ses symptômes et ses constantes… et le moteur calcule aussitôt son niveau. »
4. **Résultat du triage** *(45 s)* — « Le système attribue un **niveau**, l'oriente vers le **bon service** (ici la Cardiologie), et génère un **code de suivi** avec un **QR code** que je remets au patient. »
5. **File d'attente** *(30 s)* — « Le patient apparaît immédiatement dans la file, **classée par priorité** : les cas graves remontent automatiquement. »
6. **Côté patient** *(1 min)* — sur le 2ᵉ écran/téléphone, va sur la page de suivi et saisis le code : « De son côté, le patient suit **en temps réel** sa position dans la file et l'**itinéraire** vers le service. »
7. **Le moment clé — temps réel** *(1 min)* — connecte-toi en **médecin**, ouvre le patient, clique « **Prendre en charge** ». Montre le 2ᵉ écran : « Et instantanément, côté patient : la notification **“C'est votre tour”** s'affiche, et un **lit du service s'occupe automatiquement**. »
8. **Côté admin** *(45 s)* — connecte-toi en **admin** : « L'administrateur supervise tout : statistiques, **occupation des lits par service**, gestion des comptes, et il peut **télécharger un rapport PDF** de la journée. » *(clique sur le bouton PDF pour montrer le document généré.)*

**Ce que tu dis en sortie :**
> « En quelques secondes, on a couvert tout le parcours : triage, priorisation, orientation, prise en charge et suivi — le tout coordonné en temps réel. »

---

## 8. 📈 Résultats & valeur ajoutée (1,5 min)

**Ce que tu fais :** slide « Bénéfices ».

**Ce que tu dis :**
> « Concrètement, URGENSIA apporte :
> – un triage **plus rapide et plus sûr**, car **objectif et standardisé** ;
> – une **priorisation automatique** qui protège les cas graves ;
> – un patient **autonome et rassuré**, qui suit son parcours ;
> – une **orientation claire** vers le bon service ;
> – et des **données de pilotage** (statistiques, rapports, occupation des lits) pour l'hôpital. »

---

## 9. 🧗 Difficultés & perspectives (1,5 min)

**Ce que tu dis (difficultés — le jury adore l'honnêteté) :**
> « J'ai rencontré plusieurs défis : traduire fidèlement le protocole médical Manchester en règles logiques, garantir la **cohérence en temps réel** entre tous les écrans, et sécuriser des **données de santé** sensibles. Chacun m'a fait progresser en conception et en rigueur. »

**Ce que tu dis (perspectives — montre ta vision) :**
> « Pour la suite, j'envisage : des **notifications par SMS** pour les patients sans smartphone, un **écran d'affichage en salle d'attente**, un **dossier patient persistant** avec historique, et une **application mobile**. »

---

## 10. 🏁 Conclusion (1 min)

**Ce que tu fais :** slide de clôture (« Merci » + ton nom + contact).

**Ce que tu dis :**
> « En résumé, URGENSIA transforme un triage manuel et subjectif en un processus **numérique, objectif et coordonné en temps réel**, au service des patients comme des soignants. Aux urgences, chaque minute compte — et URGENSIA aide à ne plus en perdre. **Je vous remercie de votre attention et je suis à votre disposition pour vos questions.** »

---

## ❓ Préparation aux questions du jury

> Prépare des réponses courtes et assumées. Voici les plus probables :

- **« Pourquoi le système Manchester ? »**
  > C'est un protocole **international reconnu**, à 5 niveaux, conçu exactement pour le tri des urgences — fiable et documenté.

- **« Est-ce que ça remplace l'infirmier ? »**
  > Non — c'est une **aide à la décision**. Le soignant garde toujours le dernier mot ; l'outil objective et accélère, il ne décide pas à sa place.

- **« Comment sécurisez-vous les données des patients ? »**
  > JWT pour l'authentification, mots de passe **chiffrés (bcrypt)**, **rôles** stricts (infirmier/médecin/admin), **journal d'audit**, et le principe du moindre accès.

- **« Et si Internet coupe / à grande échelle ? »**
  > L'architecture est légère et déployée sur des services scalables. Une évolution possible est un **mode hors-ligne** (PWA) pour la robustesse.

- **« Le patient sans smartphone ? »**
  > Il reçoit un **code** et peut suivre sur n'importe quel écran ; et j'ai prévu comme évolution le **SMS** et un **écran de salle d'attente**.

- **« Pourquoi ces technologies ? »**
  > React pour une UI réactive, Node/Express pour une API simple et performante, PostgreSQL pour la fiabilité relationnelle, WebSocket pour le temps réel — des choix **standards, gratuits et maintenables**.

- **« Avez-vous validé médicalement le triage ? »**
  > La logique suit le protocole Manchester ; une **validation clinique** avec des professionnels est la prochaine étape avant un usage réel.

- **« Modèle économique / coût ? »**
  > Stack **open-source**, hébergement possible en **offre gratuite** au départ ; coût maîtrisé, idéal pour des structures à budget limité.

---

## 💡 Conseils de présentation

- **Répète à voix haute** au moins 3 fois, chronomètre-toi.
- **Ne lis pas** tes slides — elles appuient, elles ne remplacent pas.
- **Regarde le jury**, pas l'écran. Parle **lentement**, fais des pauses.
- Commence et finis **fort** (l'accroche et la conclusion se retiennent le plus).
- **Assume le stress** : respire avant de commencer, ce n'est pas grave d'hésiter.
- Garde ton **plan B** à portée (vidéo/captures) et annonce sereinement si tu bascules dessus.
- Termine **dans le temps** : mieux vaut couper une démo que dépasser.

---

## 🖼️ Trame de slides suggérée (≈ 12 slides)

1. Titre — URGENSIA + logo + ton nom
2. Le problème (triage manuel)
3. Objectifs
4. Vue d'ensemble + acteurs
5. Le parcours patient (workflow)
6. Le moteur de triage Manchester (5 niveaux)
7. L'orientation vers le bon service
8. Architecture technique
9. **DÉMO** (slide « Démonstration » — puis tu bascules sur l'app)
10. Bénéfices / valeur ajoutée
11. Difficultés & perspectives
12. Conclusion + Merci

---

## 🗂️ Annexe A — Présentation détaillée de TOUTES les fonctionnalités (script)

> À utiliser pour un tour **fonctionnalité par fonctionnalité**, ou si le jury demande « qu'est-ce que ça sait faire exactement ? ».
> Format : **[Fonctionnalité]** — *la phrase que tu dis*.

### 👤 A. Côté citoyen / patient — *aucun compte requis*
> Phrase d'intro : « Le patient est **acteur de son parcours** : il suit tout, **en temps réel** et **sans créer de compte**. »

1. **Vitrine publique (page d'accueil)** — « Un point d'entrée clair pour **accéder à son suivi** ou se connecter à l'espace soignant. »
2. **Suivi 100 % sans compte** — « Le patient n'a **rien à installer ni à créer** : un simple **code (ou QR code)**, remis après son triage, lui suffit pour suivre tout son passage. »
3. **Accès patient par code** — « À l'hôpital ou depuis son téléphone, il saisit son code pour retrouver son dossier de suivi. »
4. **Suivi de la file en temps réel** — « Il voit sa **position exacte** dans la file et une **estimation d'attente**, mises à jour en direct. »
5. **Notification “c'est bientôt votre tour” / “c'est votre tour”** — « Quand il approche de la tête de file, il est **prévenu automatiquement** — plus besoin de rester debout devant le guichet. »
6. **Orientation + plan hospitalier interactif** — « Une fois orienté, il voit **vers quel service aller** et un **plan/itinéraire** dans l'hôpital. »

### 🩺 B. Côté infirmier d'accueil-triage
> Phrase d'intro : « C'est le poste central : il enregistre le patient **et** réalise le triage. »

7. **Connexion sécurisée** — « Accès par identifiants, avec des **droits limités à son rôle**. »
8. **Tableau de bord temps réel** — « Vue d'ensemble : patients du jour, **cas critiques**, file en direct, indicateurs clés. »
9. **Enregistrement d'un nouveau patient** — « Formulaire guidé : **identité**, **constantes vitales** (température, tension, saturation, pouls…), **symptômes**, et même une **photo**. »
10. **Moteur de triage Manchester (5 niveaux)** — « À partir de ces données, le système calcule **objectivement** la priorité, du niveau 1 (critique) au niveau 5 (non urgent). »
11. **Orientation automatique par spécialité** — « Il ne se contente pas de prioriser : il **oriente vers le bon service** (Cardiologie, Neurologie, Pédiatrie, Chirurgie, Réanimation, Urgences). »
12. **Code de suivi + QR** — « Le patient repart avec un **code (PAT-XXXXXX)** et un **QR code** pour suivre son passage. »
13. **File d'attente priorisée** — « La file se **réordonne toute seule** : un cas grave remonte automatiquement devant un cas bénin, quel que soit l'ordre d'arrivée. »
14. **Vue “cas critiques”** — « Un écran dédié pour ne **jamais perdre de vue** les patients les plus graves. »
15. **Réévaluation / re-triage** — « Un patient qui attend trop longtemps est **signalé pour réévaluation** — son état a pu se dégrader. »
16. **Enregistrement d'urgence express** — « Pour un cas vital, un **flux rapide** permet de créer le patient en priorité absolue. »

### 👨‍⚕️ C. Côté médecin
> Phrase d'intro : « Le médecin travaille sur une file **déjà triée** : il prend les bons patients, dans le bon ordre. »

17. **Tableau de bord médecin** — « Statistiques de la journée, **occupation des services**, patients en attente de prise en charge. »
18. **Prise en charge (cycle de vie du patient)** — « Il fait passer le patient d'**en attente → en cours → pris en charge → sorti**, et tout le monde le voit en direct. »
19. **Gestion automatique des lits** — « Quand il prend un patient en charge, un **lit du service s'occupe tout seul** ; quand le patient sort, il se **libère automatiquement**. »
20. **Rapports PDF mis en forme** — « Il télécharge un **rapport journalier** et un **résumé des prises en charge**, générés en PDF soignés (couleurs Manchester, en-tête, pagination). »

### 🛠️ D. Côté administrateur
> Phrase d'intro : « L'admin **pilote** la plateforme et **supervise** l'activité. »

21. **Gestion des utilisateurs (CRUD complet)** — « Créer, consulter, modifier, désactiver les comptes (infirmiers, médecins, admins). »
22. **Gestion des services (CRUD complet)** — « Ajouter/modifier/supprimer un service et **éditer sa capacité en lits**. »
23. **Gestion des lits (manuelle + automatique)** — « Ajuster manuellement l'occupation, ou laisser le système la gérer au fil des prises en charge. »
24. **Réinitialisation des mots de passe** — « Trois filets de sécurité : **self-service** (lien de réinitialisation), **remise à zéro par l'admin**, et la **méthode des deux administrateurs** si un admin lui-même est bloqué. »
25. **Statistiques avancées / analytics** — « Graphiques d'activité **hebdomadaire**, **par service**, indicateurs de performance. »
26. **Journal d'audit** — « Chaque action sensible est **tracée** : qui a fait quoi, quand. »

### 🔒 E. Fonctions transversales (le socle technique)
> Phrase d'intro : « Tout cela repose sur des fondations solides. »

27. **Temps réel partout (WebSocket)** — « File, notifications, capacités : tout se synchronise **instantanément** sur tous les écrans. »
28. **Sécurité** — « Jetons **JWT + rafraîchissement**, mots de passe **chiffrés (bcrypt)**, **rôles** stricts, **limitation anti-force brute** sur la connexion, **journal d'audit**. »
29. **Profil self-service** — « Chaque utilisateur gère son **profil**, son **mot de passe** et sa **photo**. »
30. **Notifications ciblées** — « Messages envoyés à la bonne personne / au bon rôle, marquables comme lus. »
31. **Déploiement en production** — « L'application n'est pas qu'une maquette : elle est **en ligne** (front sur Netlify, back + base PostgreSQL sur Render). »
32. **Interface responsive & cohérente** — « Un design unifié, utilisable sur ordinateur comme sur mobile. »

---

## 🎯 Annexe B — « Le projet a-t-il assez de fonctionnalités ? » (verdict honnête)

**Oui, largement.** Avec **plus de 30 fonctionnalités** réparties sur **4 profils d'utilisateurs**, un **moteur de décision médical**, du **temps réel**, de la **génération de PDF**, des **statistiques**, une **sécurité complète** et un **déploiement en production**, ce projet est **au-dessus** de ce qu'on attend d'une soutenance de fin de cycle. Le risque n'est pas d'en avoir trop peu — c'est de vouloir **tout montrer** en 20 minutes.

**Tes points forts à mettre en avant :**
- Tu ne fais pas un simple CRUD : tu résous un **vrai problème métier** (le triage) avec un **protocole reconnu**.
- Tu couvres un **parcours complet** (patient → infirmier → médecin → admin), pas une seule fonction.
- Le **temps réel** et le **déploiement en ligne** impressionnent toujours un jury.

**À assumer avec honnêteté si on te pousse (prépare ces réponses) :**
- *« Où est l'IA ? »* → C'est un **système expert à base de règles**, comme le vrai protocole Manchester. En médecine d'urgence, on veut des décisions **explicables et sûres**, pas une boîte noire. (Piste d'évolution : ML sur données historiques.)
- *« Est-ce validé cliniquement ? »* → La logique **suit le protocole Manchester** ; la **validation clinique** avec des soignants est la prochaine étape avant un usage réel — assume-le comme une perspective, pas un manque.
- *« Le patient sans smartphone ? »* → Code utilisable sur n'importe quel écran ; **SMS** et **écran de salle d'attente** prévus en évolution.

**Conseil stratégique :** ne récite pas les 32 fonctionnalités. Montre le **parcours complet en démo** (Annexe A te sert de réserve), puis garde 4-5 fonctionnalités « bonus » (rapport PDF, méthode des deux admins, réévaluation, gestion auto des lits) à **sortir en réponse aux questions** — ça montre de la profondeur sans alourdir la présentation.
