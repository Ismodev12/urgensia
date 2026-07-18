'use strict';

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');

const {
  soumettrePreTriage,
  getStatutPreTriage,
  confirmerArrivee,
  listerPreTriages,
} = require('../controllers/pretriage.controller');

// ── Routes protégées (personnel hospitalier) ──────────────────────────────────

/** GET /api/pretriage — Lister les pré-triages actifs (agent/médecin/admin) */
router.get('/', auth, listerPreTriages);

/** PATCH /api/pretriage/:code/confirmer — Agent confirme l'arrivée physique */
router.patch('/:code/confirmer', auth, confirmerArrivee);

// ── Routes publiques (aucune authentification) ────────────────────────────────

/** POST /api/pretriage — Soumettre un pré-triage depuis la maison */
router.post('/', soumettrePreTriage);

/** GET /api/pretriage/:code — Consulter son statut + position en file */
router.get('/:code', getStatutPreTriage);

module.exports = router;
