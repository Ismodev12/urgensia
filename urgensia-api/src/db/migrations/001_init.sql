-- ============================================================
--  URGENSIA — Migration 001 : Création des tables
--  PostgreSQL 14+
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────
--  TABLE : services
--  Doit être créée AVANT utilisateurs (FK)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nom             VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    medecin_chef    VARCHAR(150),
    capacite_lits   INT          NOT NULL DEFAULT 10 CHECK (capacite_lits > 0),
    lits_occupes    INT          NOT NULL DEFAULT 0  CHECK (lits_occupes >= 0),
    actif           BOOLEAN      NOT NULL DEFAULT TRUE,
    date_creation   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT capacite_valide CHECK (lits_occupes <= capacite_lits)
);

-- ──────────────────────────────────────────────────────────
--  TABLE : utilisateurs
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nom                 VARCHAR(100) NOT NULL,
    prenom              VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash   VARCHAR(255) NOT NULL,
    role                VARCHAR(20)  NOT NULL
                        CHECK (role IN ('agent', 'medecin', 'admin')),
    service_id          UUID         REFERENCES services(id) ON DELETE SET NULL,
    telephone           VARCHAR(20),
    photo_url           TEXT,
    statut              VARCHAR(20)  NOT NULL DEFAULT 'actif'
                        CHECK (statut IN ('actif', 'inactif', 'suspendu')),
    date_creation       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    derniere_connexion  TIMESTAMPTZ,

    CONSTRAINT email_format CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

-- ──────────────────────────────────────────────────────────
--  TABLE : sessions (refresh tokens)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id  UUID    NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    refresh_token   TEXT    NOT NULL UNIQUE,
    adresse_ip      VARCHAR(45),
    user_agent      TEXT,
    expire_le       TIMESTAMPTZ NOT NULL,
    cree_le         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoque         BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ──────────────────────────────────────────────────────────
--  TABLE : niveaux_manchester (table de référence)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS niveaux_manchester (
    niveau          INT          PRIMARY KEY CHECK (niveau BETWEEN 1 AND 5),
    label           VARCHAR(50)  NOT NULL,
    couleur_hex     VARCHAR(7)   NOT NULL,
    bg_couleur_hex  VARCHAR(7)   NOT NULL,
    delai_max       VARCHAR(30)  NOT NULL,
    description     TEXT
);

-- ──────────────────────────────────────────────────────────
--  TABLE : patients
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nom                     VARCHAR(100) NOT NULL,
    prenom                  VARCHAR(100) NOT NULL,
    age                     INT          NOT NULL CHECK (age >= 0 AND age <= 150),
    sexe                    VARCHAR(10)  NOT NULL
                            CHECK (sexe IN ('Homme', 'Femme', 'Autre')),
    telephone               VARCHAR(20),
    adresse                 TEXT,
    photo_url               TEXT,

    -- Constantes vitales
    temperature             NUMERIC(4,1) CHECK (temperature BETWEEN 30 AND 45),
    tension_systolique      INT          CHECK (tension_systolique BETWEEN 50 AND 300),
    tension_diastolique     INT          CHECK (tension_diastolique BETWEEN 30 AND 200),
    frequence_cardiaque     INT          CHECK (frequence_cardiaque BETWEEN 20 AND 300),
    saturation_oxygene      INT          CHECK (saturation_oxygene BETWEEN 50 AND 100),
    echelle_douleur         INT          NOT NULL DEFAULT 0
                            CHECK (echelle_douleur BETWEEN 0 AND 10),

    -- Classification
    manchester_niveau       INT          REFERENCES niveaux_manchester(niveau),
    service_id              UUID         REFERENCES services(id) ON DELETE SET NULL,
    statut                  VARCHAR(20)  NOT NULL DEFAULT 'en_attente'
                            CHECK (statut IN ('en_attente', 'en_cours', 'pris_en_charge', 'sorti')),
    resume_clinique         TEXT,

    -- Qui a fait quoi
    enregistre_par          UUID         REFERENCES utilisateurs(id) ON DELETE SET NULL,
    pris_en_charge_par      UUID         REFERENCES utilisateurs(id) ON DELETE SET NULL,

    -- Horodatages
    date_arrivee            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    date_prise_en_charge    TIMESTAMPTZ,
    date_sortie             TIMESTAMPTZ
);

-- ──────────────────────────────────────────────────────────
--  TABLE : symptomes (référentiel)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS symptomes (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    label           VARCHAR(100) NOT NULL UNIQUE,
    est_critique    BOOLEAN      NOT NULL DEFAULT FALSE,
    icone           VARCHAR(50)
);

-- ──────────────────────────────────────────────────────────
--  TABLE : patient_symptomes (association M-N)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_symptomes (
    patient_id      UUID  NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
    symptome_id     UUID  NOT NULL REFERENCES symptomes(id) ON DELETE CASCADE,
    date_ajout      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (patient_id, symptome_id)
);

-- ──────────────────────────────────────────────────────────
--  TABLE : triages
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS triages (
    id                  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID  NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    realise_par         UUID  REFERENCES utilisateurs(id) ON DELETE SET NULL,
    manchester_niveau   INT   NOT NULL REFERENCES niveaux_manchester(niveau),
    service_oriente     VARCHAR(100),
    justification       TEXT,
    score_calcule       JSONB,
    date_triage         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
--  TABLE : notifications
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    destinataire_id UUID    NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    patient_id      UUID    REFERENCES patients(id) ON DELETE SET NULL,
    type            VARCHAR(20) NOT NULL
                    CHECK (type IN ('critical', 'warning', 'info', 'success')),
    message         TEXT    NOT NULL,
    est_lue         BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
--  TABLE : journal_audit
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_audit (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id  UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    adresse_ip      VARCHAR(45),
    statut          VARCHAR(10) NOT NULL
                    CHECK (statut IN ('succes', 'echec')),
    details_json    JSONB,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
--  INDEX de performance
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_statut         ON patients(statut);
CREATE INDEX IF NOT EXISTS idx_patients_manchester     ON patients(manchester_niveau ASC);
CREATE INDEX IF NOT EXISTS idx_patients_service        ON patients(service_id);
CREATE INDEX IF NOT EXISTS idx_patients_date_arrivee   ON patients(date_arrivee DESC);
CREATE INDEX IF NOT EXISTS idx_notifs_dest_non_lue     ON notifications(destinataire_id, est_lue) WHERE est_lue = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_user_time         ON journal_audit(utilisateur_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_actives        ON sessions(utilisateur_id, revoque) WHERE revoque = FALSE;
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email      ON utilisateurs(email);

SELECT '✅  Migration 001 terminée avec succès !' AS message;
