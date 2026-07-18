-- Fix services manquants
INSERT INTO services (nom, medecin_chef, capacite_lits, lits_occupes) VALUES
    ('Urgences',     'Dr. Fassinou',   20, 14),
    ('Cardiologie',  'Dr. Mensah',     15,  8),
    ('Neurologie',   'Dr. Adjovi',     12,  5),
    ('Pediatrie',    'Dr. Hounkpatin', 25, 18),
    ('Chirurgie',    'Dr. Tokponou',   10,  3),
    ('Reanimation',  'Dr. Agossou',     8,  2)
ON CONFLICT (nom) DO NOTHING;

SELECT nom, medecin_chef, capacite_lits, lits_occupes FROM services ORDER BY nom;
