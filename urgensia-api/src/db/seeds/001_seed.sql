-- ============================================================
--  URGENSIA — Seed 001 : Données initiales
--  À exécuter APRÈS 001_init.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────
--  Niveaux Manchester (données fixes)
-- ──────────────────────────────────────────────────────────
INSERT INTO niveaux_manchester (niveau, label, couleur_hex, bg_couleur_hex, delai_max, description)
VALUES
    (1, 'Critique',    '#DC2626', '#FEE2E2', 'Immédiat',    'Prise en charge immédiate requise'),
    (2, 'Très Urgent', '#EA580C', '#FFEDD5', '10 minutes',  'Prise en charge dans les 10 minutes'),
    (3, 'Urgent',      '#EAB308', '#FEF9C3', '30 minutes',  'Prise en charge dans les 30 minutes'),
    (4, 'Standard',    '#22C55E', '#DCFCE7', '60 minutes',  'Prise en charge dans l''heure'),
    (5, 'Non Urgent',  '#3B82F6', '#DBEAFE', '120 minutes', 'Prise en charge dans les 2 heures')
ON CONFLICT (niveau) DO NOTHING;

-- ──────────────────────────────────────────────────────────
--  Symptômes (référentiel)
-- ──────────────────────────────────────────────────────────
INSERT INTO symptomes (label, est_critique) VALUES
    ('Douleur thoracique',      TRUE),
    ('Difficulté respiratoire', TRUE),
    ('Hémorragie',              TRUE),
    ('Perte de connaissance',   TRUE),
    ('Convulsions',             TRUE),
    ('Traumatisme',             FALSE),
    ('Fièvre',                  FALSE),
    ('Vomissements',            FALSE),
    ('Malaise général',         FALSE),
    ('Brûlures',                FALSE),
    ('Céphalées',               FALSE),
    ('Diarrhée',                FALSE)
ON CONFLICT (label) DO NOTHING;

-- ──────────────────────────────────────────────────────────
--  Services hospitaliers
-- ──────────────────────────────────────────────────────────
INSERT INTO services (nom, medecin_chef, capacite_lits, lits_occupes) VALUES
    ('Urgences',      'Dr. Fassinou',   20, 14),
    ('Cardiologie',   'Dr. Mensah',     15,  8),
    ('Neurologie',    'Dr. Adjovi',     12,  5),
    ('Pédiatrie',     'Dr. Hounkpatin', 25, 18),
    ('Chirurgie',     'Dr. Tokponou',   10,  3),
    ('Réanimation',   'Dr. Agossou',     8,  2),
    ('Accueil',       NULL,              1,  0),
    ('Administration',NULL,              1,  0)
ON CONFLICT (nom) DO NOTHING;

-- ──────────────────────────────────────────────────────────
--  Utilisateurs de démo (mots de passe = bcrypt de la valeur ci-dessous)
--  agent    → agent123
--  medecin  → medecin123
--  admin    → admin123
--
--  IMPORTANT : Ces hashs bcrypt (cost=10) correspondent exactement
--  aux mots de passe ci-dessus. Ne pas modifier.
-- ──────────────────────────────────────────────────────────

-- Récupération des IDs de services pour les FK
DO $$
DECLARE
    sid_urgences       UUID;
    sid_accueil        UUID;
    sid_administration UUID;
BEGIN
    SELECT id INTO sid_urgences       FROM services WHERE nom = 'Urgences';
    SELECT id INTO sid_accueil        FROM services WHERE nom = 'Accueil';
    SELECT id INTO sid_administration FROM services WHERE nom = 'Administration';

    -- Agent d'accueil (demo) — mot de passe: agent123
    INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role, service_id, telephone, statut)
    VALUES (
        'Hounkpatin', 'Christelle',
        'c.hounkpatin@urgensia.bj',
        '$2b$10$wmzosWEP5bOLY5fqAYBtzOuufQFeobqAc8JRRGVnKqda7WEGuHLSu',
        'agent',
        sid_accueil,
        '+229 96 33 44 55',
        'actif'
    ) ON CONFLICT (email) DO NOTHING;

    -- Médecin (demo) — mot de passe: medecin123
    INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role, service_id, telephone, statut)
    VALUES (
        'Fassinou', 'Jean-Baptiste',
        'jb.fassinou@urgensia.bj',
        '$2b$10$3BHRUjHVrpoC7Oks.qRMOOAq9xvz1wdYml83z3Mnhuz1uOHpuSbX.',
        'medecin',
        sid_urgences,
        '+229 97 00 11 22',
        'actif'
    ) ON CONFLICT (email) DO NOTHING;

    -- Administrateur (demo) — mot de passe: admin123
    INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role, service_id, telephone, statut)
    VALUES (
        'Kiki', 'Nadège',
        'n.kiki@urgensia.bj',
        '$2b$10$ltxDqZldRRwkKc4Gb6bnvOzHtL7n.83AkJNzVnxsUn5k3BmkNqPye',
        'admin',
        sid_administration,
        '+229 95 66 77 88',
        'actif'
    ) ON CONFLICT (email) DO NOTHING;

END $$;

SELECT '✅  Seed 001 inséré avec succès !' AS message;
SELECT '📋  Comptes de démo :' AS info;
SELECT email, role, 'Voir .env.example pour les mots de passe' AS mdp FROM utilisateurs ORDER BY role;
