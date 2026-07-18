# URGENSIA — Spécification de modélisation (à fournir à une IA génératrice de diagrammes)

> **Instructions pour l'IA destinataire :** À partir de la description ci-dessous, génère successivement
> (1) le **diagramme de classes UML** (classes, attributs typés, énumérations, associations avec
> multiplicités et rôles), (2) le **diagramme de cas d'utilisation UML** (acteurs, généralisations,
> `include`/`extend`), (3) le **modèle relationnel**, (4) le **schéma relationnel**, et (5) le
> **dictionnaire des données**. Respecte scrupuleusement les multiplicités, les types et les contraintes
> indiqués. Langue : français. Notation UML standard.

---

## 0. Contexte fonctionnel

**URGENSIA** est une plateforme numérique d'aide au **pré-triage et au triage médical** pour les
établissements de santé (Bénin). Elle implémente l'échelle **Manchester Triage System (MTS)** à 5 niveaux.

Flux principal :
1. Un **citoyen** peut, depuis chez lui, réaliser un **pré-triage** (déclaration de symptômes) ; le système
   calcule un niveau MTS indicatif et délivre un **code de suivi**.
2. À l'hôpital, l'**agent d'accueil** enregistre le patient ; l'**infirmier de triage** réalise le triage
   Manchester (constantes vitales + symptômes → niveau MTS + service d'orientation + résumé clinique) et
   remet un **code de suivi** (format `PAT-XXXXXX`).
3. Le **patient** suit en temps réel sa position dans la file et son **orientation** (itinéraire vers le service).
4. Le **médecin** consulte la file priorisée, prend les patients en charge, et édite des rapports PDF.
5. L'**administrateur** gère utilisateurs, services et consulte le journal d'audit.
6. Le système **réévalue** : si le délai cible d'un niveau est dépassé, le patient est marqué « à réévaluer »
   (le système ne modifie jamais seul le niveau ; il signale qu'un re-triage est nécessaire).

---

## 1. Énumérations

- **RoleUtilisateur** : `AGENT`, `MEDECIN`, `ADMIN`
- **StatutUtilisateur** : `ACTIF`, `INACTIF`, `SUSPENDU`
- **Sexe** : `HOMME`, `FEMME`, `AUTRE`  *(le pré-triage ajoute `INCONNU`)*
- **StatutPatient** : `EN_ATTENTE`, `EN_COURS`, `PRIS_EN_CHARGE`, `SORTI`
- **StatutPreTriage** : `EN_ATTENTE`, `ARRIVE`, `EN_COURS`, `TERMINE`, `EXPIRE`
- **TypeNotification** : `CRITICAL`, `WARNING`, `INFO`, `SUCCESS`
- **StatutAudit** : `SUCCES`, `ECHEC`
- **NiveauMTS** (niveaux Manchester, valeurs fixes 1→5) :
  `1 = Critique` (immédiat), `2 = Très Urgent` (10 min), `3 = Urgent` (30 min),
  `4 = Standard` (60 min), `5 = Non Urgent` (120 min).
  > Modélisé comme **classe de référence `NiveauManchester`** (car porteuse d'attributs : libellé, couleur,
  > délai, délai cible), avec 5 instances figées. On peut aussi le représenter comme énumération si l'on
  > ne veut pas de classe de référence.

---

## 2. Diagramme de classes

### 2.1 Classes et attributs

> Type des attributs entre parenthèses. `PK` = clé primaire, `*` = obligatoire (NOT NULL), `U` = unique.

**Utilisateur**
- id (UUID) PK
- nom (String) *
- prenom (String) *
- email (String) * U
- motDePasseHash (String) *
- role (RoleUtilisateur) *
- telephone (String)
- photoUrl (String)
- statut (StatutUtilisateur) * = ACTIF
- dateCreation (DateTime) *
- derniereConnexion (DateTime)

**Session** *(jetons de rafraîchissement / refresh tokens)*
- id (UUID) PK
- refreshToken (String) * U
- adresseIp (String)
- userAgent (String)
- expireLe (DateTime) *
- creeLe (DateTime) *
- revoque (Boolean) * = false

**Service**
- id (UUID) PK
- nom (String) * U
- description (String)
- medecinChef (String)
- capaciteLits (Integer) * = 10  *(> 0)*
- litsOccupes (Integer) * = 0  *(>= 0 et <= capaciteLits)*
- actif (Boolean) * = true
- dateCreation (DateTime) *

**NiveauManchester** *(classe de référence, 5 instances : 1..5)*
- niveau (Integer) PK *(1..5)*
- label (String) *
- couleurHex (String) *
- bgCouleurHex (String) *
- delaiMax (String) *  *(texte d'affichage, ex. « 10 minutes »)*
- delaiCibleMinutes (Integer)  *(0, 10, 30, 60, 120)*
- description (String)

**Patient**
- id (UUID) PK
- nom (String) *
- prenom (String) *
- age (Integer) *  *(0..150)*
- sexe (Sexe) *
- telephone (String)
- adresse (String)
- photoUrl (String)
- temperature (Decimal 4,1)  *(30..45)*
- tensionSystolique (Integer)  *(50..300)*
- tensionDiastolique (Integer)  *(30..200)*
- frequenceCardiaque (Integer)  *(20..300)*
- saturationOxygene (Integer)  *(50..100)*
- echelleDouleur (Integer) * = 0  *(0..10)*
- statut (StatutPatient) * = EN_ATTENTE
- resumeClinique (String)
- codeSuivi (String) U  *(format `PAT-XXXXXX`)*
- aReevaluer (Boolean) * = false
- dateArrivee (DateTime) *
- datePriseEnCharge (DateTime)
- dateSortie (DateTime)

**Symptome** *(référentiel)*
- id (UUID) PK
- label (String) * U
- estCritique (Boolean) * = false
- icone (String)

**PatientSymptome** *(classe d'association entre Patient et Symptome)*
- dateAjout (DateTime) *
- *(clé = {patient, symptome})*

**Triage** *(historisé : un patient peut avoir plusieurs triages ; un seul « courant »)*
- id (UUID) PK
- serviceOriente (String)  *(nom du service recommandé par le moteur MTS)*
- justification (String)
- scoreCalcule (JSON)
- estCourant (Boolean) * = true  *(le triage courant ; au plus un par patient)*
- numeroTriage (Integer) * = 1  *(1 = initial, 2+ = re-triages)*
- dateTriage (DateTime) *
- dateReevaluation (DateTime)  *(= dateTriage + délai cible du niveau)*

**PreTriage** *(pré-triage citoyen à distance, sans compte)*
- id (UUID) PK
- codeSuivi (String) * U  *(format `URG-XXXX`)*
- nom (String) * = 'Inconnu'
- prenom (String) * = '—'
- age (Integer)  *(0..150)*
- sexe (Sexe)  *(inclut INCONNU)*
- telephone (String)
- douleurThoracique (Boolean) * = false
- difficulteRespiratoire (Boolean) * = false
- hemorragie (Boolean) * = false
- traumatisme (Boolean) * = false
- perteConnaissance (Boolean) * = false
- convulsions (Boolean) * = false
- fievre (Boolean) * = false
- vomissements (Boolean) * = false
- malaise (Boolean) * = false
- brulures (Boolean) * = false
- cephalees (Boolean) * = false
- diarrhee (Boolean) * = false
- echelleDouleur (Integer) * = 0  *(0..10)*
- temperature (Decimal 4,1)  *(30..45)*
- resumeClinique (String)
- recommandations (JSON)
- serviceOriente (String)
- scoreDetail (JSON)
- statut (StatutPreTriage) * = EN_ATTENTE
- dateCreation (DateTime) *
- dateConfirmation (DateTime)
- expireLe (DateTime) *  *(dateCreation + 24 h)*

**LocalisationService** *(plan interactif / orientation — découplé des services par le nom)*
- id (UUID) PK
- serviceNom (String) * U  *(clé textuelle de liaison avec le service orienté du moteur MTS)*
- batiment (String) * = 'Bâtiment Principal'
- etage (String) * = 'Rez-de-chaussée'
- salle (String)
- descriptionChemin (String)
- planX (Float) * = 0
- planY (Float) * = 0
- cheminDepuisAccueil (JSON) *  *(tableau de points {x, y})*
- couleurPlan (String) * = '#0F766E'
- iconeEmoji (String)
- dateMiseAJour (DateTime) *

**Notification**
- id (UUID) PK
- type (TypeNotification) *
- message (String) *
- estLue (Boolean) * = false
- dateCreation (DateTime) *

**JournalAudit**
- id (UUID) PK
- action (String) *
- adresseIp (String)
- statut (StatutAudit) *
- detailsJson (JSON)
- timestamp (DateTime) *

### 2.2 Associations et multiplicités

> Lecture : `A (mult. côté A) —— rôle —— (mult. côté B) B`.

1. **Service 1 ──< Utilisateur 0..\***
   Un service emploie 0..\* utilisateurs ; un utilisateur appartient à **0..1** service.
   *(service_id nullable, ON DELETE SET NULL)*

2. **Service 1 ──< Patient 0..\*** (rôle : « orienté vers »)
   Un service accueille 0..\* patients ; un patient est orienté vers **0..1** service.

3. **Utilisateur 1 ──< Session 0..\***
   Un utilisateur possède 0..\* sessions ; une session appartient à **exactement 1** utilisateur.

4. **NiveauManchester 1 ──< Patient 0..\*** (rôle : « niveau courant »)
   Un patient a **0..1** niveau Manchester (nullable tant que non trié).

5. **NiveauManchester 1 ──< Triage 0..\*** (rôle : « niveau attribué »)
   Un triage référence **exactement 1** niveau Manchester.

6. **NiveauManchester 0..1 ──< Triage 0..\*** (rôle : « niveau précédent »)
   Un re-triage peut référencer **0..1** niveau précédent (NULL au triage initial).

7. **Utilisateur 0..1 ──< Patient 0..\*** (rôle : « enregistré par »)
   Un patient est enregistré par **0..1** utilisateur (agent/infirmier).

8. **Utilisateur 0..1 ──< Patient 0..\*** (rôle : « pris en charge par »)
   Un patient est pris en charge par **0..1** utilisateur (médecin).

9. **Patient 1 ──< Triage 0..\*** (composition forte ; ON DELETE CASCADE)
   Un patient a 0..\* triages (≥ 1 dès qu'il est trié), dont **exactement un** `estCourant = true`.
   Un triage appartient à **exactement 1** patient.

10. **Utilisateur 0..1 ──< Triage 0..\*** (rôle : « réalisé par »)
    Un triage est réalisé par **0..1** utilisateur.

11. **Patient 0..\* ──< PatientSymptome >── 0..\* Symptome** (association N-N, classe d'association `PatientSymptome` portant `dateAjout`)
    Un patient présente 0..\* symptômes ; un symptôme concerne 0..\* patients.
    *(côté classe d'association : Patient 1 ──< PatientSymptome 0..\* ; Symptome 1 ──< PatientSymptome 0..\*)*

12. **Patient 0..1 ──── PreTriage 0..1** (rôle : « issu du pré-triage »)
    Un pré-triage peut être rattaché à **0..1** patient (après confirmation d'arrivée) ; un patient provient
    d'**0..1** pré-triage.

13. **NiveauManchester 0..1 ──< PreTriage 0..\***
    Un pré-triage a **0..1** niveau MTS calculé.

14. **Utilisateur 1 ──< Notification 0..\*** (rôle : « destinataire »)
    Une notification a **exactement 1** destinataire (utilisateur).

15. **Patient 0..1 ──< Notification 0..\*** (rôle : « concerne »)
    Une notification concerne **0..1** patient.

16. **Utilisateur 0..1 ──< JournalAudit 0..\***
    Une entrée d'audit est rattachée à **0..1** utilisateur (NULL si action anonyme/échec de login).

17. **Service 0..1 ┄┄ LocalisationService 0..1** (association **faible/textuelle** via `serviceNom`)
    Liaison conceptuelle par le **nom** de service (et non par clé étrangère) — volontairement découplée
    pour permettre de remplacer le plan sans impacter les autres tables. À représenter en pointillés
    (dépendance) plutôt qu'en association forte.

> **Remarque de spécialisation (optionnelle) :** dans les données, `Utilisateur.role` distingue agent /
> médecin / admin. Si l'on souhaite un modèle par héritage, on peut spécialiser `Utilisateur` en
> `AgentDeTriage`, `Medecin`, `Administrateur` (généralisation), mais la version fidèle à la base est une
> classe `Utilisateur` unique avec l'énumération `RoleUtilisateur`.

---

## 3. Diagramme de cas d'utilisation

### 3.1 Acteurs

- **Citoyen / Patient** *(acteur externe, non authentifié)* — usager grand public (pré-triage, suivi, orientation).
- **Utilisateur authentifié** *(acteur abstrait)* — parent des acteurs internes ; porte les cas communs
  d'authentification et de profil.
- **Agent d'accueil** *(spécialise « Utilisateur authentifié », rôle technique `agent`)* — accueil/enregistrement.
- **Infirmier de triage** *(spécialise « Agent d'accueil »)* — réalise le triage Manchester.
  > ⚠️ **L'agent d'accueil et l'infirmier de triage sont deux acteurs distincts**, mais **l'infirmier de
  > triage peut endosser le rôle d'agent d'accueil** : modéliser par une **généralisation d'acteur**
  > `Infirmier de triage ▷ Agent d'accueil` (l'infirmier hérite donc de tous les cas de l'agent d'accueil).
- **Médecin** *(spécialise « Utilisateur authentifié », rôle `medecin`)*.
- **Administrateur** *(spécialise « Utilisateur authentifié », rôle `admin`)*.
- **Système / Minuteur** *(acteur secondaire)* — déclenche les traitements automatiques (réévaluations,
  expiration des codes, notifications temps réel, journalisation).

### 3.2 Cas d'utilisation communs (acteur « Utilisateur authentifié »)
- Se connecter  *(« include » : Journaliser l'action d'audit)*
- Rafraîchir la session
- Se déconnecter
- Consulter et modifier son profil  *(inclut : changer photo de profil)*
- Consulter ses notifications / marquer comme lues

### 3.3 Cas d'utilisation — Citoyen / Patient (public)
- Réaliser un pré-triage à distance  *(« include » : Calculer le niveau MTS ; « include » : Générer un code de suivi `URG-XXXX`)*
- Consulter le résultat et les recommandations de son pré-triage *(par code)*
- Suivre sa prise en charge / sa position dans la file *(par code, temps réel)*
- Consulter son orientation (service + itinéraire sur le plan)
- Accéder à son suivi via **scan d'un QR code**
- Activer les notifications du navigateur

### 3.4 Cas d'utilisation — Agent d'accueil
- Enregistrer un nouveau patient  *(« include » : Effectuer le triage Manchester)*
- Confirmer l'arrivée d'un pré-triage citoyen  *(« include » : Créer/relier le dossier patient)*
- Consulter la liste des pré-triages en attente
- Consulter la file d'attente (patients actifs, priorisés)
- Consulter le tableau de bord et les statistiques opérationnelles

### 3.5 Cas d'utilisation — Infirmier de triage *(hérite de l'Agent d'accueil)*
- Effectuer le triage Manchester
  *(« include » : Saisir les constantes vitales ; « include » : Sélectionner les symptômes ;
  « include » : Calculer le niveau MTS ; « include » : Générer le code de suivi `PAT-XXXXXX`)*
- Déclencher une prise en charge d'urgence / signaler un cas critique
- Réévaluer un patient (re-triage)  *(« extend » : Effectuer le triage Manchester ; conserve l'historique)*
- Lancer le scan des réévaluations dues *(partagé avec « Système »)*
- Ajouter / supprimer la photo d'un patient
- (Re)générer le code de suivi d'un patient

### 3.6 Cas d'utilisation — Médecin
- Consulter le tableau de bord médecin et les statistiques avancées
- Consulter la file priorisée / les cas prioritaires / ses patients
- Consulter le dossier complet d'un patient (constantes, symptômes, résumé clinique)
- Prendre en charge un patient  *(« extend » : Marquer « pris en charge » ; « extend » : Marquer « sorti »)*
- Télécharger le **rapport journalier** (PDF)
- Télécharger le **résumé des prises en charge** (PDF détaillé, une fiche par patient)

### 3.7 Cas d'utilisation — Administrateur
- Gérer les utilisateurs (créer, consulter, modifier, supprimer)
- Gérer les services (créer, consulter, modifier, supprimer)
- Consulter le journal d'audit
- Consulter l'ensemble des statistiques

### 3.8 Cas d'utilisation — Système / Minuteur *(acteur secondaire)*
- Scanner périodiquement les délais de réévaluation dépassés → marquer les patients « à réévaluer »
- Expirer les codes de pré-triage au-delà de 24 h
- Émettre les événements **temps réel** (nouveau patient, changement de statut, réévaluation, re-triage,
  nouveau pré-triage, mise à jour du suivi)
- Journaliser les actions sensibles (audit)

### 3.9 Relations entre cas
- **Tous** les cas des acteurs internes `« include »` **Se connecter** (authentification préalable).
- **Enregistrer un patient** `« include »` **Effectuer le triage Manchester**.
- **Effectuer le triage Manchester** `« include »` **Calculer le niveau MTS** et **Générer le code de suivi**.
- **Réévaluer un patient** `« extend »` **Effectuer le triage Manchester**.
- **Prendre en charge un patient** `« extend »` par **Marquer pris en charge** / **Marquer sorti**.
- Généralisation d'acteurs : `Agent d'accueil`, `Médecin`, `Administrateur` ▷ `Utilisateur authentifié` ;
  `Infirmier de triage` ▷ `Agent d'accueil`.

---

## 4. Modèle relationnel

> Notation : `RELATION(attr1, attr2, …)` — **clé primaire soulignée** rendue ici en **gras**, `#` = clé étrangère.

- **SERVICES**(**id**, nom, description, medecin_chef, capacite_lits, lits_occupes, actif, date_creation)
- **UTILISATEURS**(**id**, nom, prenom, email, mot_de_passe_hash, role, #service_id, telephone, photo_url, statut, date_creation, derniere_connexion)
  *(#service_id → SERVICES.id)*
- **SESSIONS**(**id**, #utilisateur_id, refresh_token, adresse_ip, user_agent, expire_le, cree_le, revoque)
  *(#utilisateur_id → UTILISATEURS.id)*
- **NIVEAUX_MANCHESTER**(**niveau**, label, couleur_hex, bg_couleur_hex, delai_max, delai_cible_minutes, description)
- **PATIENTS**(**id**, nom, prenom, age, sexe, telephone, adresse, photo_url, temperature, tension_systolique, tension_diastolique, frequence_cardiaque, saturation_oxygene, echelle_douleur, #manchester_niveau, #service_id, statut, resume_clinique, code_suivi, a_reevaluer, #enregistre_par, #pris_en_charge_par, date_arrivee, date_prise_en_charge, date_sortie)
  *(#manchester_niveau → NIVEAUX_MANCHESTER.niveau ; #service_id → SERVICES.id ; #enregistre_par → UTILISATEURS.id ; #pris_en_charge_par → UTILISATEURS.id)*
- **SYMPTOMES**(**id**, label, est_critique, icone)
- **PATIENT_SYMPTOMES**(**#patient_id**, **#symptome_id**, date_ajout)
  *(clé primaire composite ; #patient_id → PATIENTS.id ; #symptome_id → SYMPTOMES.id)*
- **TRIAGES**(**id**, #patient_id, #realise_par, #manchester_niveau, service_oriente, justification, score_calcule, est_courant, numero_triage, date_reevaluation, #niveau_precedent, date_triage)
  *(#patient_id → PATIENTS.id ; #realise_par → UTILISATEURS.id ; #manchester_niveau → NIVEAUX_MANCHESTER.niveau ; #niveau_precedent → NIVEAUX_MANCHESTER.niveau)*
- **PRE_TRIAGES**(**id**, code_suivi, nom, prenom, age, sexe, telephone, douleur_thoracique, difficulte_respiratoire, hemorragie, traumatisme, perte_connaissance, convulsions, fievre, vomissements, malaise, brulures, cephalees, diarrhee, echelle_douleur, temperature, #manchester_niveau, resume_clinique, recommandations, service_oriente, score_detail, statut, #patient_id, date_creation, date_confirmation, expire_le)
  *(#manchester_niveau → NIVEAUX_MANCHESTER.niveau ; #patient_id → PATIENTS.id)*
- **LOCALISATION_SERVICES**(**id**, service_nom, batiment, etage, salle, description_chemin, plan_x, plan_y, chemin_depuis_accueil, couleur_plan, icone_emoji, date_mise_a_jour)
  *(service_nom : clé candidate UNIQUE ; liaison textuelle non contrainte vers SERVICES.nom)*
- **NOTIFICATIONS**(**id**, #destinataire_id, #patient_id, type, message, est_lue, date_creation)
  *(#destinataire_id → UTILISATEURS.id ; #patient_id → PATIENTS.id)*
- **JOURNAL_AUDIT**(**id**, #utilisateur_id, action, adresse_ip, statut, details_json, timestamp)
  *(#utilisateur_id → UTILISATEURS.id)*

### Règles / contraintes d'intégrité notables
- `SERVICES` : `capacite_lits > 0`, `lits_occupes >= 0`, `lits_occupes <= capacite_lits`.
- `UTILISATEURS.email` UNIQUE + format e-mail ; suppression d'un service ⇒ `service_id` mis à NULL.
- `PATIENTS` : bornes des constantes vitales (cf. dictionnaire) ; `code_suivi` UNIQUE ; suppression d'un
  utilisateur référencé ⇒ `enregistre_par` / `pris_en_charge_par` mis à NULL.
- `TRIAGES` : **index unique partiel** garantissant **au plus un** triage avec `est_courant = TRUE` par
  patient ; suppression d'un patient ⇒ cascade sur ses triages et ses associations symptômes.
- `PATIENT_SYMPTOMES` : clé primaire composite `(patient_id, symptome_id)` ; cascade des deux côtés.
- `PRE_TRIAGES.code_suivi` UNIQUE ; `expire_le` par défaut = `date_creation + 24h`.

---

## 5. Schéma relationnel (types et contraintes — PostgreSQL)

```
SERVICES(
  id              UUID  PK  DEFAULT gen_random_uuid(),
  nom             VARCHAR(100)  NOT NULL UNIQUE,
  description     TEXT,
  medecin_chef    VARCHAR(150),
  capacite_lits   INT   NOT NULL DEFAULT 10  CHECK (> 0),
  lits_occupes    INT   NOT NULL DEFAULT 0   CHECK (>= 0),
  actif           BOOLEAN NOT NULL DEFAULT TRUE,
  date_creation   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (lits_occupes <= capacite_lits)
)

UTILISATEURS(
  id                 UUID PK DEFAULT gen_random_uuid(),
  nom                VARCHAR(100) NOT NULL,
  prenom             VARCHAR(100) NOT NULL,
  email              VARCHAR(255) NOT NULL UNIQUE  CHECK (format e-mail),
  mot_de_passe_hash  VARCHAR(255) NOT NULL,
  role               VARCHAR(20)  NOT NULL CHECK (IN 'agent','medecin','admin'),
  service_id         UUID FK → services(id) ON DELETE SET NULL,
  telephone          VARCHAR(20),
  photo_url          TEXT,
  statut             VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (IN 'actif','inactif','suspendu'),
  date_creation      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  derniere_connexion TIMESTAMPTZ
)

SESSIONS(
  id             UUID PK DEFAULT gen_random_uuid(),
  utilisateur_id UUID NOT NULL FK → utilisateurs(id) ON DELETE CASCADE,
  refresh_token  TEXT NOT NULL UNIQUE,
  adresse_ip     VARCHAR(45),
  user_agent     TEXT,
  expire_le      TIMESTAMPTZ NOT NULL,
  cree_le        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoque        BOOLEAN NOT NULL DEFAULT FALSE
)

NIVEAUX_MANCHESTER(
  niveau               INT PK CHECK (BETWEEN 1 AND 5),
  label                VARCHAR(50) NOT NULL,
  couleur_hex          VARCHAR(7)  NOT NULL,
  bg_couleur_hex       VARCHAR(7)  NOT NULL,
  delai_max            VARCHAR(30) NOT NULL,
  delai_cible_minutes  INT,
  description          TEXT
)

PATIENTS(
  id                   UUID PK DEFAULT gen_random_uuid(),
  nom                  VARCHAR(100) NOT NULL,
  prenom               VARCHAR(100) NOT NULL,
  age                  INT NOT NULL CHECK (BETWEEN 0 AND 150),
  sexe                 VARCHAR(10) NOT NULL CHECK (IN 'Homme','Femme','Autre'),
  telephone            VARCHAR(20),
  adresse              TEXT,
  photo_url            TEXT,
  temperature          NUMERIC(4,1) CHECK (BETWEEN 30 AND 45),
  tension_systolique   INT CHECK (BETWEEN 50 AND 300),
  tension_diastolique  INT CHECK (BETWEEN 30 AND 200),
  frequence_cardiaque  INT CHECK (BETWEEN 20 AND 300),
  saturation_oxygene   INT CHECK (BETWEEN 50 AND 100),
  echelle_douleur      INT NOT NULL DEFAULT 0 CHECK (BETWEEN 0 AND 10),
  manchester_niveau    INT FK → niveaux_manchester(niveau),
  service_id           UUID FK → services(id) ON DELETE SET NULL,
  statut               VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                         CHECK (IN 'en_attente','en_cours','pris_en_charge','sorti'),
  resume_clinique      TEXT,
  code_suivi           VARCHAR(12) UNIQUE,
  a_reevaluer          BOOLEAN NOT NULL DEFAULT FALSE,
  enregistre_par       UUID FK → utilisateurs(id) ON DELETE SET NULL,
  pris_en_charge_par   UUID FK → utilisateurs(id) ON DELETE SET NULL,
  date_arrivee         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_prise_en_charge TIMESTAMPTZ,
  date_sortie          TIMESTAMPTZ
)

SYMPTOMES(
  id           UUID PK DEFAULT gen_random_uuid(),
  label        VARCHAR(100) NOT NULL UNIQUE,
  est_critique BOOLEAN NOT NULL DEFAULT FALSE,
  icone        VARCHAR(50)
)

PATIENT_SYMPTOMES(
  patient_id   UUID NOT NULL FK → patients(id)  ON DELETE CASCADE,
  symptome_id  UUID NOT NULL FK → symptomes(id) ON DELETE CASCADE,
  date_ajout   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (patient_id, symptome_id)
)

TRIAGES(
  id                 UUID PK DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL FK → patients(id) ON DELETE CASCADE,
  realise_par        UUID FK → utilisateurs(id) ON DELETE SET NULL,
  manchester_niveau  INT  NOT NULL FK → niveaux_manchester(niveau),
  service_oriente    VARCHAR(100),
  justification      TEXT,
  score_calcule      JSONB,
  est_courant        BOOLEAN NOT NULL DEFAULT TRUE,
  numero_triage      INT NOT NULL DEFAULT 1,
  date_reevaluation  TIMESTAMPTZ,
  niveau_precedent   INT FK → niveaux_manchester(niveau),
  date_triage        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- INDEX UNIQUE PARTIEL : un seul est_courant = TRUE par patient_id
)

PRE_TRIAGES(
  id                      UUID PK DEFAULT gen_random_uuid(),
  code_suivi              VARCHAR(12) NOT NULL UNIQUE,
  nom                     VARCHAR(100) NOT NULL DEFAULT 'Inconnu',
  prenom                  VARCHAR(100) NOT NULL DEFAULT '—',
  age                     INT CHECK (BETWEEN 0 AND 150),
  sexe                    VARCHAR(10) CHECK (IN 'Homme','Femme','Autre','Inconnu'),
  telephone               VARCHAR(20),
  douleur_thoracique      BOOLEAN NOT NULL DEFAULT FALSE,
  difficulte_respiratoire BOOLEAN NOT NULL DEFAULT FALSE,
  hemorragie              BOOLEAN NOT NULL DEFAULT FALSE,
  traumatisme             BOOLEAN NOT NULL DEFAULT FALSE,
  perte_connaissance      BOOLEAN NOT NULL DEFAULT FALSE,
  convulsions             BOOLEAN NOT NULL DEFAULT FALSE,
  fievre                  BOOLEAN NOT NULL DEFAULT FALSE,
  vomissements            BOOLEAN NOT NULL DEFAULT FALSE,
  malaise                 BOOLEAN NOT NULL DEFAULT FALSE,
  brulures                BOOLEAN NOT NULL DEFAULT FALSE,
  cephalees               BOOLEAN NOT NULL DEFAULT FALSE,
  diarrhee                BOOLEAN NOT NULL DEFAULT FALSE,
  echelle_douleur         INT NOT NULL DEFAULT 0 CHECK (BETWEEN 0 AND 10),
  temperature             NUMERIC(4,1) CHECK (BETWEEN 30 AND 45),
  manchester_niveau       INT FK → niveaux_manchester(niveau),
  resume_clinique         TEXT,
  recommandations         JSONB,
  service_oriente         VARCHAR(100),
  score_detail            JSONB,
  statut                  VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                            CHECK (IN 'en_attente','arrive','en_cours','termine','expire'),
  patient_id              UUID FK → patients(id) ON DELETE SET NULL,
  date_creation           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_confirmation       TIMESTAMPTZ,
  expire_le               TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
)

LOCALISATION_SERVICES(
  id                    UUID PK DEFAULT gen_random_uuid(),
  service_nom           VARCHAR(100) NOT NULL UNIQUE,
  batiment              VARCHAR(100) NOT NULL DEFAULT 'Bâtiment Principal',
  etage                 VARCHAR(50)  NOT NULL DEFAULT 'Rez-de-chaussée',
  salle                 VARCHAR(50),
  description_chemin     TEXT,
  plan_x                FLOAT NOT NULL DEFAULT 0,
  plan_y                FLOAT NOT NULL DEFAULT 0,
  chemin_depuis_accueil JSONB NOT NULL DEFAULT '[]',
  couleur_plan          VARCHAR(7) NOT NULL DEFAULT '#0F766E',
  icone_emoji           VARCHAR(10) DEFAULT '🏥',
  date_mise_a_jour      TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

NOTIFICATIONS(
  id              UUID PK DEFAULT gen_random_uuid(),
  destinataire_id UUID NOT NULL FK → utilisateurs(id) ON DELETE CASCADE,
  patient_id      UUID FK → patients(id) ON DELETE SET NULL,
  type            VARCHAR(20) NOT NULL CHECK (IN 'critical','warning','info','success'),
  message         TEXT NOT NULL,
  est_lue         BOOLEAN NOT NULL DEFAULT FALSE,
  date_creation   TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

JOURNAL_AUDIT(
  id             UUID PK DEFAULT gen_random_uuid(),
  utilisateur_id UUID FK → utilisateurs(id) ON DELETE SET NULL,
  action         VARCHAR(100) NOT NULL,
  adresse_ip     VARCHAR(45),
  statut         VARCHAR(10) NOT NULL CHECK (IN 'succes','echec'),
  details_json   JSONB,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

---

## 6. Dictionnaire des données

> Colonnes : **Attribut** · Description · Type · Contraintes / Obligatoire (O = obligatoire).

### Table `services`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant du service | UUID | PK, O |
| nom | Nom du service | VARCHAR(100) | UNIQUE, O |
| description | Description libre | TEXT | — |
| medecin_chef | Nom du médecin-chef | VARCHAR(150) | — |
| capacite_lits | Nombre total de lits | INT | O, > 0, défaut 10 |
| lits_occupes | Lits occupés | INT | O, >= 0, <= capacite_lits, défaut 0 |
| actif | Service actif | BOOLEAN | O, défaut TRUE |
| date_creation | Date de création | TIMESTAMPTZ | O, défaut NOW() |

### Table `utilisateurs`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant | UUID | PK, O |
| nom | Nom | VARCHAR(100) | O |
| prenom | Prénom | VARCHAR(100) | O |
| email | Adresse e-mail (identifiant de connexion) | VARCHAR(255) | UNIQUE, O, format e-mail |
| mot_de_passe_hash | Hachage bcrypt du mot de passe | VARCHAR(255) | O |
| role | Rôle | VARCHAR(20) | O, ∈ {agent, medecin, admin} |
| service_id | Service de rattachement | UUID | FK→services, NULL si supprimé |
| telephone | Téléphone | VARCHAR(20) | — |
| photo_url | URL photo de profil | TEXT | — |
| statut | Statut du compte | VARCHAR(20) | O, ∈ {actif, inactif, suspendu}, défaut actif |
| date_creation | Date de création | TIMESTAMPTZ | O, défaut NOW() |
| derniere_connexion | Dernière connexion | TIMESTAMPTZ | — |

### Table `sessions`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant de session | UUID | PK, O |
| utilisateur_id | Utilisateur propriétaire | UUID | FK→utilisateurs, O, CASCADE |
| refresh_token | Jeton de rafraîchissement | TEXT | UNIQUE, O |
| adresse_ip | IP d'émission | VARCHAR(45) | — |
| user_agent | Agent utilisateur | TEXT | — |
| expire_le | Date d'expiration | TIMESTAMPTZ | O |
| cree_le | Date de création | TIMESTAMPTZ | O, défaut NOW() |
| revoque | Révoquée | BOOLEAN | O, défaut FALSE |

### Table `niveaux_manchester`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| niveau | Niveau MTS | INT | PK, 1..5 |
| label | Libellé (Critique…Non Urgent) | VARCHAR(50) | O |
| couleur_hex | Couleur principale | VARCHAR(7) | O |
| bg_couleur_hex | Couleur de fond | VARCHAR(7) | O |
| delai_max | Délai d'affichage | VARCHAR(30) | O |
| delai_cible_minutes | Délai cible (minutes) pour réévaluation | INT | 0/10/30/60/120 |
| description | Description | TEXT | — |

### Table `patients`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant | UUID | PK, O |
| nom | Nom | VARCHAR(100) | O |
| prenom | Prénom | VARCHAR(100) | O |
| age | Âge | INT | O, 0..150 |
| sexe | Sexe | VARCHAR(10) | O, ∈ {Homme, Femme, Autre} |
| telephone | Téléphone | VARCHAR(20) | — |
| adresse | Adresse | TEXT | — |
| photo_url | Photo du patient | TEXT | — |
| temperature | Température (°C) | NUMERIC(4,1) | 30..45 |
| tension_systolique | TA systolique (mmHg) | INT | 50..300 |
| tension_diastolique | TA diastolique (mmHg) | INT | 30..200 |
| frequence_cardiaque | Fréquence cardiaque (bpm) | INT | 20..300 |
| saturation_oxygene | SpO₂ (%) | INT | 50..100 |
| echelle_douleur | Échelle de douleur (EVA) | INT | O, 0..10, défaut 0 |
| manchester_niveau | Niveau MTS courant | INT | FK→niveaux_manchester |
| service_id | Service d'orientation | UUID | FK→services, NULL si supprimé |
| statut | Statut dans le flux | VARCHAR(20) | O, ∈ {en_attente, en_cours, pris_en_charge, sorti} |
| resume_clinique | Résumé clinique | TEXT | — |
| code_suivi | Code de suivi patient (PAT-XXXXXX) | VARCHAR(12) | UNIQUE |
| a_reevaluer | Réévaluation requise (délai dépassé) | BOOLEAN | O, défaut FALSE |
| enregistre_par | Utilisateur ayant enregistré | UUID | FK→utilisateurs, NULL si supprimé |
| pris_en_charge_par | Médecin de prise en charge | UUID | FK→utilisateurs, NULL si supprimé |
| date_arrivee | Date/heure d'arrivée | TIMESTAMPTZ | O, défaut NOW() |
| date_prise_en_charge | Date/heure de prise en charge | TIMESTAMPTZ | — |
| date_sortie | Date/heure de sortie | TIMESTAMPTZ | — |

### Table `symptomes`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant | UUID | PK, O |
| label | Libellé du symptôme | VARCHAR(100) | UNIQUE, O |
| est_critique | Symptôme critique | BOOLEAN | O, défaut FALSE |
| icone | Nom d'icône | VARCHAR(50) | — |

### Table `patient_symptomes` (association)
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| patient_id | Patient | UUID | PK composite, FK→patients, CASCADE |
| symptome_id | Symptôme | UUID | PK composite, FK→symptomes, CASCADE |
| date_ajout | Date d'association | TIMESTAMPTZ | O, défaut NOW() |

### Table `triages`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant | UUID | PK, O |
| patient_id | Patient trié | UUID | FK→patients, O, CASCADE |
| realise_par | Infirmier/agent ayant trié | UUID | FK→utilisateurs, NULL si supprimé |
| manchester_niveau | Niveau attribué | INT | FK→niveaux_manchester, O |
| service_oriente | Service recommandé (texte MTS) | VARCHAR(100) | — |
| justification | Justification du triage | TEXT | — |
| score_calcule | Détail du score MTS | JSONB | — |
| est_courant | Triage courant du patient | BOOLEAN | O, défaut TRUE, ≤ 1 TRUE/patient |
| numero_triage | N° d'ordre (1=initial) | INT | O, défaut 1 |
| date_reevaluation | Échéance de réévaluation | TIMESTAMPTZ | — |
| niveau_precedent | Niveau avant re-triage | INT | FK→niveaux_manchester |
| date_triage | Date/heure du triage | TIMESTAMPTZ | O, défaut NOW() |

### Table `pre_triages`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant | UUID | PK, O |
| code_suivi | Code de suivi citoyen (URG-XXXX) | VARCHAR(12) | UNIQUE, O |
| nom / prenom | Identité (optionnelle) | VARCHAR(100) | O, défauts 'Inconnu'/'—' |
| age | Âge | INT | 0..150 |
| sexe | Sexe | VARCHAR(10) | ∈ {Homme, Femme, Autre, Inconnu} |
| telephone | Téléphone | VARCHAR(20) | — |
| douleur_thoracique … diarrhee | 12 drapeaux de symptômes (miroir du moteur MTS) | BOOLEAN | O, défaut FALSE |
| echelle_douleur | EVA déclarée | INT | O, 0..10, défaut 0 |
| temperature | Température déclarée | NUMERIC(4,1) | 30..45 |
| manchester_niveau | Niveau MTS calculé | INT | FK→niveaux_manchester |
| resume_clinique | Résumé généré | TEXT | — |
| recommandations | Recommandations | JSONB | — |
| service_oriente | Service suggéré | VARCHAR(100) | — |
| score_detail | Détail du score | JSONB | — |
| statut | Statut du flux | VARCHAR(20) | O, ∈ {en_attente, arrive, en_cours, termine, expire} |
| patient_id | Dossier patient lié (après arrivée) | UUID | FK→patients, NULL si supprimé |
| date_creation | Date de soumission | TIMESTAMPTZ | O, défaut NOW() |
| date_confirmation | Date de confirmation d'arrivée | TIMESTAMPTZ | — |
| expire_le | Expiration du code | TIMESTAMPTZ | O, défaut NOW()+24h |

### Table `localisation_services`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant | UUID | PK, O |
| service_nom | Nom de service (clé de liaison textuelle) | VARCHAR(100) | UNIQUE, O |
| batiment | Bâtiment | VARCHAR(100) | O, défaut 'Bâtiment Principal' |
| etage | Étage | VARCHAR(50) | O, défaut 'Rez-de-chaussée' |
| salle | Salle | VARCHAR(50) | — |
| description_chemin | Description de l'itinéraire | TEXT | — |
| plan_x / plan_y | Coordonnées sur le plan SVG | FLOAT | O, défaut 0 |
| chemin_depuis_accueil | Points du trajet depuis l'accueil | JSONB | O, défaut '[]' |
| couleur_plan | Couleur sur le plan | VARCHAR(7) | O, défaut '#0F766E' |
| icone_emoji | Icône du service | VARCHAR(10) | défaut '🏥' |
| date_mise_a_jour | Dernière mise à jour | TIMESTAMPTZ | O, défaut NOW() |

### Table `notifications`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant | UUID | PK, O |
| destinataire_id | Utilisateur destinataire | UUID | FK→utilisateurs, O, CASCADE |
| patient_id | Patient concerné | UUID | FK→patients, NULL si supprimé |
| type | Type d'alerte | VARCHAR(20) | O, ∈ {critical, warning, info, success} |
| message | Contenu | TEXT | O |
| est_lue | Lue | BOOLEAN | O, défaut FALSE |
| date_creation | Date | TIMESTAMPTZ | O, défaut NOW() |

### Table `journal_audit`
| Attribut | Description | Type | Contraintes |
|---|---|---|---|
| id | Identifiant | UUID | PK, O |
| utilisateur_id | Auteur de l'action | UUID | FK→utilisateurs, NULL si supprimé |
| action | Action réalisée | VARCHAR(100) | O |
| adresse_ip | Adresse IP | VARCHAR(45) | — |
| statut | Issue | VARCHAR(10) | O, ∈ {succes, echec} |
| details_json | Détails contextuels | JSONB | — |
| timestamp | Horodatage | TIMESTAMPTZ | O, défaut NOW() |

---

*Document généré à partir de l'analyse du code source URGENSIA (migrations SQL, contrôleurs, routes).
11 tables, 8 énumérations, 17 associations.*
