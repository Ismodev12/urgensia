'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/patients.controller');
const photoCtrl = require('../controllers/photo.controller');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');
const { upload } = require('../middleware/upload');

// Tous les routes patients nécessitent d'être authentifié
router.use(auth);

router.get ('/',                    roles('agent', 'medecin', 'admin'), ctrl.listerPatients);
// ⚡ Cas critique : enregistrement rapide sans constantes — niveau 1 forcé
router.post('/urgence',             roles('agent'),                     ctrl.creerPatientUrgence);
// 🔁 Réévaluation : détection des délais cibles dépassés (tâche planifiée / chargement file)
router.post('/reevaluation/scan',   roles('agent', 'admin'),            ctrl.scanReevaluations);
router.post('/',                    roles('agent'),                     ctrl.creerPatient);
router.get ('/:id',                 roles('agent', 'medecin', 'admin'), ctrl.getPatient);
router.get ('/:id/triages',         roles('agent', 'medecin', 'admin'), ctrl.getHistoriqueTriages);
// Changement de statut réservé au médecin (l'agent/infirmier ne gère pas la prise en charge)
router.patch('/:id/statut',         roles('medecin'),                   ctrl.changerStatut);
// 🔁 Re-triage : seul l'infirmier de triage (agent d'accueil) peut le déclencher
router.post ('/:id/triage',         roles('agent'),                     ctrl.retriagePatient);

// ── Photo de profil patient ─────────────────────────────────────────────────
/** POST /api/patients/:id/photo — Upload / remplacement de la photo */
router.post(
  '/:id/photo',
  roles('agent'),
  upload.single('photo'),
  photoCtrl.uploadPhoto
);

/** DELETE /api/patients/:id/photo — Supprimer la photo */
router.delete('/:id/photo', roles('agent'), photoCtrl.deletePhoto);

module.exports = router;
