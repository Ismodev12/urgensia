'use strict';
const env = require('../config/env');

/**
 * Gestionnaire d'erreurs global Express.
 * Doit être le DERNIER middleware enregistré dans app.js.
 */
const errorHandler = (err, req, res, next) => {
  // Log l'erreur en développement
  if (env.nodeEnv === 'development') {
    console.error('💥', err.stack);
  } else {
    console.error('💥', err.message);
  }

  // Erreurs de validation (express-validator)
  if (err.type === 'validation') {
    return res.status(422).json({ error: 'Données invalides', details: err.errors });
  }

  // Erreurs PostgreSQL
  if (err.code) {
    // Violation de contrainte unique
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cette valeur existe déjà', detail: err.detail });
    }
    // Violation de contrainte FK
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Référence invalide', detail: err.detail });
    }
    // Violation CHECK
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Valeur hors limites', detail: err.detail });
    }
  }

  // Erreur par défaut
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Erreur interne du serveur' : err.message,
  });
};

module.exports = errorHandler;
