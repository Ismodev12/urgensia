-- ============================================================
--  URGENSIA — Migration 007 : Réinitialisation de mot de passe
--  À exécuter APRÈS 006_fix_localisation.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS password_resets (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id   UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token            VARCHAR(64) NOT NULL UNIQUE,
    expire_le        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    utilise          BOOLEAN     NOT NULL DEFAULT FALSE,
    date_creation    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour la recherche par token
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- Index pour le nettoyage des tokens expirés
CREATE INDEX IF NOT EXISTS idx_password_resets_expire ON password_resets(expire_le);

SELECT '✅  Migration 007 terminée : table password_resets créée !' AS message;
