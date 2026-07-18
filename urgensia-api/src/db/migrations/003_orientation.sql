-- ============================================================
--  URGENSIA — Migration 003 : Orientation & Plan Interactif
--  À exécuter APRÈS 002_pretriage.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────
--  TABLE : localisation_services
--  Coordonnées et localisation de chaque service sur le plan
--  Architecture découplée pour permettre le remplacement
--  du plan fictif par le plan réel sans toucher aux autres tables.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS localisation_services (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Clé de liaison avec le moteur MTS (valeur du champ "service")
    service_nom             VARCHAR(100) NOT NULL UNIQUE,

    -- Localisation textuelle
    batiment                VARCHAR(100) NOT NULL DEFAULT 'Bâtiment Principal',
    etage                   VARCHAR(50)  NOT NULL DEFAULT 'Rez-de-chaussée',
    salle                   VARCHAR(50),
    description_chemin      TEXT,

    -- Coordonnées sur le plan SVG (viewBox 0 0 780 480)
    plan_x                  FLOAT        NOT NULL DEFAULT 0,
    plan_y                  FLOAT        NOT NULL DEFAULT 0,

    -- Chemin depuis l'accueil : tableau de points {x, y}
    -- Permet l'animation de la ligne de trajet dans le SVG
    chemin_depuis_accueil   JSONB        NOT NULL DEFAULT '[]',

    -- Apparence sur le plan
    couleur_plan            VARCHAR(7)   NOT NULL DEFAULT '#0F766E',
    icone_emoji             VARCHAR(10)  DEFAULT '🏥',

    date_mise_a_jour        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Données initiales — Plan fictif URGENSIA ─────────────────────────────────
-- Le plan SVG a un viewBox 780x480
-- L'Accueil est le point de départ universel (70, 240)

INSERT INTO localisation_services
    (service_nom, batiment, etage, salle, description_chemin,
     plan_x, plan_y, chemin_depuis_accueil, couleur_plan, icone_emoji)
VALUES

-- ACCUEIL (point de départ)
('Accueil', 'Bâtiment A', 'Rez-de-chaussée', 'Hall Principal',
 'Vous êtes à l''accueil. C''est votre point de départ.',
 70, 240,
 '[{"x":70,"y":240}]',
 '#1E3A8A', '🚪'),

-- URGENCES (couloir principal, 1ère à gauche)
('Service des Urgences', 'Bâtiment A', 'Rez-de-chaussée', 'Salles 1 à 3',
 'Depuis l''accueil, prenez le couloir principal à droite. Les Urgences sont la première porte sur votre gauche.',
 240, 160,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":160},{"x":240,"y":160}]',
 '#DC2626', '🚨'),

-- RÉANIMATION (au fond du couloir urgent)
('Réanimation / Urgences Vitales', 'Bâtiment A', 'Rez-de-chaussée', 'Bloc Réanimation',
 'Prenez le couloir principal à droite, passez les Urgences et continuez jusqu''au bout. Le Bloc Réanimation est à l''extrémité.',
 400, 160,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":160},{"x":400,"y":160}]',
 '#B91C1C', '❤️‍🔥'),

-- MÉDECINE GÉNÉRALE (couloir sud)
('Médecine Générale / Urgences', 'Bâtiment A', 'Rez-de-chaussée', 'Aile D',
 'Depuis l''accueil, tournez à droite dans le couloir principal, puis prenez le premier couloir à droite. Médecine Générale est au fond.',
 240, 320,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":320},{"x":240,"y":320}]',
 '#0F766E', '🩺'),

-- CARDIOLOGIE (1er étage)
('Service des Urgences', 'Bâtiment B', '1er étage', 'Aile Cardiologie C-1',
 'Prenez le couloir principal vers la droite, empruntez les escaliers B au fond du couloir. Cardiologie est au 1er étage, aile C.',
 400, 320,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":320},{"x":400,"y":320}]',
 '#EA580C', '💓'),

-- PÉDIATRIE (aile B, 1er étage)
('Médecine Générale', 'Bâtiment B', '1er étage', 'Aile Pédiatrie P-2',
 'Depuis l''accueil, prenez le couloir principal, montez au 1er étage par l''ascenseur central. Pédiatrie est dans l''aile droite.',
 560, 320,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":320},{"x":560,"y":320}]',
 '#22C55E', '👶'),

-- RADIOLOGIE (sous-sol bâtiment B)
('Consultation Externe', 'Bâtiment B', 'Sous-sol', 'Bloc Radiologie R-0',
 'Prenez l''ascenseur central jusqu''au sous-sol. Suivez les panneaux "Radiologie" (flèches bleues).',
 560, 160,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":160},{"x":560,"y":160}]',
 '#3B82F6', '🔬'),

-- LABORATOIRE (sous-sol bâtiment A)
('Médecine Générale / Urgences', 'Bâtiment A', 'Sous-sol', 'Laboratoire L-01',
 'Depuis l''accueil, prenez l''escalier central en face de vous. Le laboratoire est au sous-sol, tourner à droite.',
 560, 240,
 '[{"x":70,"y":240},{"x":560,"y":240}]',
 '#8B5CF6', '🧪')

ON CONFLICT (service_nom) DO NOTHING;

-- Index de recherche rapide
CREATE INDEX IF NOT EXISTS idx_localisation_service_nom ON localisation_services(service_nom);

SELECT '✅  Migration 003 terminée : table localisation_services créée et peuplée !' AS message;
