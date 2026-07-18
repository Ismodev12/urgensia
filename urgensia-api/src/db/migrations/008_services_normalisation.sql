-- ============================================================
--  URGENSIA — Migration 007 : Normalisation & enrichissement des services
--  À exécuter APRÈS 006_localisation_specialites.sql
--
--  Objectifs :
--   1. Restaurer les accents des noms de services perdus lors du seed
--      (« Pediatrie » → « Pédiatrie », « Reanimation » → « Réanimation »).
--      Sans cela, le moteur MTS (qui renvoie « Pédiatrie »/« Réanimation »)
--      ne retrouvait pas le service (ILIKE n'est pas insensible aux accents),
--      d'où service_id NULL et orientation en repli.
--   2. Ajouter une description à chaque service existant (donnée descriptive).
-- ============================================================

-- 1. Correction des accents (aligne services ↔ moteur MTS ↔ localisations)
UPDATE services SET nom = 'Pédiatrie'   WHERE nom = 'Pediatrie';
UPDATE services SET nom = 'Réanimation' WHERE nom = 'Reanimation';

-- 2. Descriptions des services
UPDATE services SET description = 'Accueil et prise en charge des urgences médicales et chirurgicales, 24h/24. Premier point de tri des patients.'
  WHERE nom = 'Urgences';
UPDATE services SET description = 'Diagnostic et traitement des pathologies cardiovasculaires : douleurs thoraciques, troubles du rythme, insuffisance cardiaque.'
  WHERE nom = 'Cardiologie';
UPDATE services SET description = 'Prise en charge des troubles neurologiques : convulsions, pertes de connaissance, céphalées sévères, suspicion d''AVC.'
  WHERE nom = 'Neurologie';
UPDATE services SET description = 'Soins dédiés aux enfants de moins de 15 ans : urgences pédiatriques et suivi spécialisé.'
  WHERE nom = 'Pédiatrie';
UPDATE services SET description = 'Prise en charge chirurgicale : traumatismes, plaies, hémorragies et brûlures nécessitant une intervention.'
  WHERE nom = 'Chirurgie';
UPDATE services SET description = 'Unité de soins intensifs pour les urgences vitales : détresses respiratoires, états de choc, défaillances d''organes.'
  WHERE nom = 'Réanimation';
UPDATE services SET description = 'Point d''entrée de l''établissement : orientation et enregistrement des patients à l''arrivée.'
  WHERE nom = 'Accueil';
UPDATE services SET description = 'Gestion administrative et pilotage de l''établissement.'
  WHERE nom = 'Administration';

-- 3. Backfill : rattacher les patients dont le service_id était resté NULL
--    (résolution en échec avant la correction des accents) via leur triage courant.
UPDATE patients p
   SET service_id = s.id
  FROM triages t
  JOIN services s ON s.nom ILIKE t.service_oriente
 WHERE t.patient_id = p.id
   AND t.est_courant = TRUE
   AND p.service_id IS NULL;

-- 4. Backfill des anciennes fiches : anciens libellés MTS → service réel.
--    (Avant l'orientation par spécialité, service_oriente contenait un libellé
--     d'affichage, ex. « Médecine Générale / Urgences », et non un nom de service.)
UPDATE patients p SET service_id = s.id
  FROM triages t, services s
 WHERE t.patient_id = p.id AND t.est_courant = TRUE AND p.service_id IS NULL
   AND s.nom = 'Réanimation'
   AND t.service_oriente ILIKE '%Réanimation%';

UPDATE patients p SET service_id = s.id
  FROM triages t, services s
 WHERE t.patient_id = p.id AND t.est_courant = TRUE AND p.service_id IS NULL
   AND s.nom = 'Urgences'
   AND (t.service_oriente ILIKE '%Urgences%'
        OR t.service_oriente ILIKE '%Médecine Générale%'
        OR t.service_oriente ILIKE '%Consultation%');

SELECT '✅  Migration 007 terminée : services normalisés (accents), décrits et patients rattachés.' AS message;
