'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/notifications.controller');
const auth   = require('../middleware/auth');

router.use(auth);

router.get  ('/',               ctrl.mesNotifications);
router.get  ('/count',          ctrl.compterNonLues);
router.patch('/lire-tout',      ctrl.marquerToutesLues);
router.patch('/:id/lire',       ctrl.marquerLue);

module.exports = router;
