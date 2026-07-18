'use strict';

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { getSuiviPatient, genererCodeSuivi } = require('../controllers/suivi.controller');

// ── Route publique (patient scanne son QR ou entre son code) ─────────────────

/** GET /api/suivi/:code — Statut + orientation + file d'attente du patient */
router.get('/:code', getSuiviPatient);

// ── Route protégée (agent génère le code après triage) ───────────────────────

/** POST /api/suivi/generer/:patientId — Générer le code suivi pour un patient */
router.post('/generer/:patientId', auth, genererCodeSuivi);

module.exports = router;
