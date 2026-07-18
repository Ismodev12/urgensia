'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/services.controller');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');

router.use(auth);

router.get ('/',    roles('agent','medecin','admin'), ctrl.listerServices);
router.get ('/:id', roles('agent','medecin','admin'), ctrl.getService);
router.post('/',    roles('admin'),                   ctrl.creerService);
router.put ('/:id', roles('admin'),                   ctrl.modifierService);
router.delete('/:id', roles('admin'),                 ctrl.supprimerService);

module.exports = router;
