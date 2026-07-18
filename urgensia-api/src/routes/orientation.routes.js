'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getPlan,
  getOrientationPatient,
  getOrientationPreTriage,
} = require('../controllers/orientation.controller');

// ── Routes publiques ──────────────────────────────────────────────────────────

/** GET /api/orientation/plan — Données complètes du plan SVG */
router.get('/plan', getPlan);

/** GET /api/orientation/pretriage/:code — Orientation par code pré-triage */
router.get('/pretriage/:code', getOrientationPreTriage);

// ── Routes protégées ──────────────────────────────────────────────────────────

/** GET /api/orientation/patient/:patientId — Orientation d'un patient enregistré */
router.get('/patient/:patientId', auth, getOrientationPatient);

module.exports = router;
