'use strict';
const jwt = require('jsonwebtoken');
const env  = require('../config/env');

/**
 * Middleware d'authentification JWT.
 * Vérifie le token Bearer dans l'en-tête Authorization.
 */
const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' });
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    req.user = decoded; // { id, email, role, serviceId }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = auth;
