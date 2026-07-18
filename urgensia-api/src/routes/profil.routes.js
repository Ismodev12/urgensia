'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/profil.controller');
const auth   = require('../middleware/auth');
const { uploadUser } = require('../middleware/upload');

// Profil self-service : tout utilisateur authentifié gère SON compte
router.use(auth);

router.get   ('/',             ctrl.getProfil);
router.patch ('/',             ctrl.modifierProfil);
router.patch ('/mot-de-passe', ctrl.changerMotDePasse);
router.post  ('/photo',        uploadUser.single('photo'), ctrl.uploadPhotoProfil);
router.delete('/photo',        ctrl.supprimerPhotoProfil);

module.exports = router;
