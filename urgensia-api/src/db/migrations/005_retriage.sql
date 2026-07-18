-- ============================================================
--  URGENSIA — Migration 005 : Re-triage (réévaluation MTS)
--  À exécuter APRÈS 004_code_suivi_patient.sql
--
--  Objectif : permettre la réévaluation d'un patient en attente
--  sans écraser le triage initial (conservation de l'historique).
--
--  Règle métier : le système ne modifie JAMAIS seul le niveau
--  d'urgence ; il calcule une date de réévaluation et signale,
--  une fois ce délai dépassé, qu'une réévaluation est nécessaire.
-- ============================================================

-- ──────────────────────────────────────────────────────────
--  1. Délai cible numérique par niveau Manchester
--     dateReevaluation = dateTriage + delai_cible_minutes
--     (le champ texte delai_max reste pour l'affichage)
-- ──────────────────────────────────────────────────────────
ALTER TABLE niveaux_manchester
  ADD COLUMN IF NOT EXISTS delai_cible_minutes INT;

UPDATE niveaux_manchester SET delai_cible_minutes = CASE niveau
    WHEN 1 THEN 0     -- Critique     → Immédiat
    WHEN 2 THEN 10    -- Très Urgent  → 10 minutes
    WHEN 3 THEN 30    -- Urgent       → 30 minutes
    WHEN 4 THEN 60    -- Standard     → 60 minutes
    WHEN 5 THEN 120   -- Non Urgent   → 2 heures
END
WHERE delai_cible_minutes IS NULL;

COMMENT ON COLUMN niveaux_manchester.delai_cible_minutes IS
  'Délai cible de prise en charge en minutes. Sert au calcul de la date de réévaluation.';

-- ──────────────────────────────────────────────────────────
--  2. Conservation de l'historique des triages
--     Avant : 1 seul triage par patient (contrainte UNIQUE).
--     Après : N triages par patient ; le plus récent porte
--             est_courant = TRUE (indicateur du résultat courant).
-- ──────────────────────────────────────────────────────────

-- Retirer la contrainte UNIQUE auto-générée sur patient_id
ALTER TABLE triages DROP CONSTRAINT IF EXISTS triages_patient_id_key;

ALTER TABLE triages
  ADD COLUMN IF NOT EXISTS est_courant       BOOLEAN     NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS numero_triage     INT         NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS date_reevaluation TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS niveau_precedent  INT REFERENCES niveaux_manchester(niveau);

COMMENT ON COLUMN triages.est_courant IS
  'TRUE pour le résultat de triage courant du patient. Les triages antérieurs passent à FALSE (historique conservé).';
COMMENT ON COLUMN triages.numero_triage IS
  'Numéro d''ordre du triage pour ce patient : 1 = triage initial, 2+ = re-triages.';
COMMENT ON COLUMN triages.date_reevaluation IS
  'Date à laquelle une réévaluation devient nécessaire = date_triage + délai cible du niveau attribué.';
COMMENT ON COLUMN triages.niveau_precedent IS
  'Niveau Manchester du triage précédent (NULL pour le triage initial). Trace l''évolution lors d''un re-triage.';

-- Backfill : date de réévaluation des triages existants
UPDATE triages t
SET date_reevaluation = t.date_triage
    + (COALESCE(nm.delai_cible_minutes, 60) || ' minutes')::interval
FROM niveaux_manchester nm
WHERE nm.niveau = t.manchester_niveau
  AND t.date_reevaluation IS NULL;

-- Un seul triage courant par patient (index partiel unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_triages_patient_courant
  ON triages(patient_id) WHERE est_courant = TRUE;

-- Lecture rapide de l'historique d'un patient
CREATE INDEX IF NOT EXISTS idx_triages_patient_histo
  ON triages(patient_id, numero_triage DESC);

-- Scan des délais dépassés
CREATE INDEX IF NOT EXISTS idx_triages_reevaluation
  ON triages(date_reevaluation) WHERE est_courant = TRUE;

-- ──────────────────────────────────────────────────────────
--  3. Marqueur « à réévaluer » sur le patient
--     Le système le positionne quand le délai est dépassé ;
--     il NE change PAS le niveau d'urgence lui-même.
-- ──────────────────────────────────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS a_reevaluer BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN patients.a_reevaluer IS
  'TRUE quand le délai cible du niveau est dépassé : signale à l''infirmier de triage qu''une réévaluation est requise. Remis à FALSE après le re-triage.';

CREATE INDEX IF NOT EXISTS idx_patients_a_reevaluer
  ON patients(a_reevaluer) WHERE a_reevaluer = TRUE;

SELECT '✅  Migration 005 terminée : re-triage (historique + réévaluation) prêt !' AS message;
