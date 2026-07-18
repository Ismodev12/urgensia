'use strict';
const router       = require('express').Router();
const ctrl         = require('../controllers/stats.controller');
const rapportCtrl  = require('../controllers/rapport.controller');
const auth         = require('../middleware/auth');
const roles        = require('../middleware/roles');

router.use(auth);

router.get('/dashboard',          roles('agent','medecin','admin'), ctrl.dashboard);
router.get('/weekly',             roles('agent','medecin','admin'), ctrl.weekly);
router.get('/services',           roles('agent','medecin','admin'), ctrl.statsServices);
router.get('/analytics',          roles('agent','medecin','admin'), ctrl.analytics);
router.get('/audit',              roles('admin'),                   ctrl.journalAudit);
router.get('/rapport-journalier',     roles('medecin','admin'),     rapportCtrl.rapportJournalier);
router.get('/resume-prises-en-charge', roles('medecin','admin'),    rapportCtrl.resumePrisEnCharge);

module.exports = router;
