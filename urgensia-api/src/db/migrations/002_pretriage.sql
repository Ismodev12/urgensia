-- ============================================================
--  URGENSIA — Migration 002 : Pré-triage citoyen
--  À exécuter APRÈS 001_init.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────
--  TABLE : pre_triages
--  Soumissions de pré-triage depuis la maison (sans compte)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pre_triages (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Code de suivi unique affiché au patient (ex: URG-4X7K)
    code_suivi              VARCHAR(12)  NOT NULL UNIQUE,

    -- Identité patient (optionnel)
    nom                     VARCHAR(100) NOT NULL DEFAULT 'Inconnu',
    prenom                  VARCHAR(100) NOT NULL DEFAULT '—',
    age                     INT          CHECK (age >= 0 AND age <= 150),
    sexe                    VARCHAR(10)  CHECK (sexe IN ('Homme', 'Femme', 'Autre', 'Inconnu')),
    telephone               VARCHAR(20),

    -- ── Drapeaux symptômes (miroir exact du moteur MTS) ──
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

    -- Constantes vitales déclarées (optionnel)
    echelle_douleur         INT  NOT NULL DEFAULT 0 CHECK (echelle_douleur BETWEEN 0 AND 10),
    temperature             NUMERIC(4,1) CHECK (temperature BETWEEN 30 AND 45),

    -- ── Résultat MTS calculé ──────────────────────────────
    manchester_niveau       INT          REFERENCES niveaux_manchester(niveau),
    resume_clinique         TEXT,
    recommandations         JSONB,
    service_oriente         VARCHAR(100),
    score_detail            JSONB,

    -- ── Statut dans le flux ───────────────────────────────
    statut                  VARCHAR(20)  NOT NULL DEFAULT 'en_attente'
                            CHECK (statut IN (
                                'en_attente',   -- soumis, patient pas encore arrivé
                                'arrive',       -- agent a confirmé l'arrivée physique
                                'en_cours',     -- médecin le prend en charge
                                'termine',      -- consultation terminée
                                'expire'        -- code expiré (>24h)
                            )),

    -- Lié à un dossier patient réel quand l'agent confirme
    patient_id              UUID REFERENCES patients(id) ON DELETE SET NULL,

    -- ── Horodatages ───────────────────────────────────────
    date_creation           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    date_confirmation       TIMESTAMPTZ,
    expire_le               TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ── Index de performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pretriage_code     ON pre_triages(code_suivi);
CREATE INDEX IF NOT EXISTS idx_pretriage_statut   ON pre_triages(statut, manchester_niveau);
CREATE INDEX IF NOT EXISTS idx_pretriage_expire   ON pre_triages(expire_le) WHERE statut = 'en_attente';

SELECT '✅  Migration 002 terminée : table pre_triages créée !' AS message;
