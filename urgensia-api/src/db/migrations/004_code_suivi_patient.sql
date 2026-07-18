-- ─── Migration 004 : Code de suivi patient ────────────────────────────────────
-- Ajoute la colonne code_suivi à la table patients.
-- Ce code est généré lors du triage par l'infirmier et remis au patient
-- pour lui permettre de suivre sa position dans la file d'attente.

-- Ajouter la colonne code_suivi à la table patients
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS code_suivi VARCHAR(12) UNIQUE;

-- Index pour les recherches rapides par code_suivi
CREATE INDEX IF NOT EXISTS idx_patients_code_suivi
  ON patients(code_suivi)
  WHERE code_suivi IS NOT NULL;

-- Commentaire de documentation
COMMENT ON COLUMN patients.code_suivi IS
  'Code unique communiqué au patient après triage par l''infirmier. Format: PAT-XXXXXX. Permet au patient de suivre sa position dans la file depuis son téléphone.';
