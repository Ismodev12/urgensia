-- ============================================================
--  URGENSIA — Migration 006 : Localisations des services de spécialité
--  À exécuter APRÈS 003_orientation.sql
--
--  Depuis l'orientation par spécialité (moteur MTS), le triage peut diriger
--  vers Cardiologie / Neurologie / Pédiatrie / Chirurgie. On ajoute leur
--  localisation sur le plan afin que l'itinéraire patient s'affiche correctement.
--  (Réanimation et Urgences sont déjà couverts par correspondance partielle.)
-- ============================================================

INSERT INTO localisation_services
    (service_nom, batiment, etage, salle, description_chemin,
     plan_x, plan_y, chemin_depuis_accueil, couleur_plan, icone_emoji)
VALUES

-- URGENCES (nom exact du service — évite le repli « Médecine Générale / Urgences »)
('Urgences', 'Bâtiment A', 'Rez-de-chaussée', 'Salles 1 à 3',
 'Depuis l''accueil, prenez le couloir principal à droite. Les Urgences sont la première porte sur votre gauche.',
 240, 160,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":160},{"x":240,"y":160}]',
 '#DC2626', '🚨'),

-- RÉANIMATION (nom exact du service)
('Réanimation', 'Bâtiment A', 'Rez-de-chaussée', 'Bloc Réanimation',
 'Depuis l''accueil, prenez le couloir principal à droite, passez les Urgences et continuez jusqu''au bout. Le Bloc Réanimation est à l''extrémité.',
 330, 120,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":120},{"x":330,"y":120}]',
 '#B91C1C', '❤️'),

-- CARDIOLOGIE (Bâtiment B, 1er étage)
('Cardiologie', 'Bâtiment B', '1er étage', 'Aile Cardiologie C-1',
 'Depuis l''accueil, prenez le couloir principal à droite puis les escaliers B au fond. La Cardiologie est au 1er étage, aile C.',
 400, 320,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":320},{"x":400,"y":320}]',
 '#EA580C', '💓'),

-- NEUROLOGIE (Bâtiment B, 1er étage)
('Neurologie', 'Bâtiment B', '1er étage', 'Aile Neurologie N-1',
 'Depuis l''accueil, prenez le couloir principal à droite, montez au 1er étage par l''ascenseur central. La Neurologie est dans l''aile gauche.',
 560, 320,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":320},{"x":560,"y":320}]',
 '#8B5CF6', '🧠'),

-- PÉDIATRIE (Bâtiment B, 1er étage)
('Pédiatrie', 'Bâtiment B', '1er étage', 'Aile Pédiatrie P-2',
 'Depuis l''accueil, prenez le couloir principal, montez au 1er étage par l''ascenseur central. La Pédiatrie est dans l''aile droite.',
 560, 160,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":160},{"x":560,"y":160}]',
 '#22C55E', '👶'),

-- CHIRURGIE (Bâtiment A, Rez-de-chaussée)
('Chirurgie', 'Bâtiment A', 'Rez-de-chaussée', 'Bloc Chirurgical B-2',
 'Depuis l''accueil, prenez le couloir principal à droite. Le Bloc Chirurgical est la deuxième porte sur votre gauche.',
 400, 160,
 '[{"x":70,"y":240},{"x":155,"y":240},{"x":155,"y":160},{"x":400,"y":160}]',
 '#0EA5E9', '🔪')

ON CONFLICT (service_nom) DO NOTHING;

SELECT '✅  Migration 006 terminée : localisations des spécialités ajoutées !' AS message;
