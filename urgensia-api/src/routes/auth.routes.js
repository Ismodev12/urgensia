'use strict';
const router     = require('express').Router();
const rateLimit  = require('express-rate-limit');
const ctrl       = require('../controllers/auth.controller');
const auth       = require('../middleware/auth');

// Anti brute-force sur le login : 10 tentatives / 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Anti brute-force sur le forgot-password : 5 tentatives / 15 minutes
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de demandes de réinitialisation. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',           loginLimiter,  ctrl.login);
router.post('/refresh',                        ctrl.refresh);
router.post('/logout',          auth,          ctrl.logout);
router.get ('/me',              auth,          ctrl.me);
router.post('/forgot-password', forgotLimiter, ctrl.forgotPassword);
router.post('/reset-password',                 ctrl.resetPassword);

module.exports = router;
