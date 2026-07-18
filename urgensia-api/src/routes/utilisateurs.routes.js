'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/utilisateurs.controller');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');

router.use(auth);
router.use(roles('admin')); // Toutes les routes utilisateurs = admin uniquement

router.get   ('/',    ctrl.listerUtilisateurs);
router.get   ('/:id', ctrl.getUtilisateur);
router.post  ('/',    ctrl.creerUtilisateur);
router.patch ('/:id', ctrl.modifierUtilisateur);
router.delete('/:id', ctrl.supprimerUtilisateur);

module.exports = router;
