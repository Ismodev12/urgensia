'use strict';
const db = require('../config/db');

/**
 * Middleware d'audit automatique.
 * Enregistre chaque action dans journal_audit après réponse.
 *
 * @param {string} action - Description de l'action (ex: 'Connexion utilisateur')
 */
const audit = (action) => (req, res, next) => {
  // Intercepte la fin de la réponse
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // Enregistrement asynchrone (non bloquant)
    const statut = res.statusCode < 400 ? 'succes' : 'echec';
    const utilisateurId = req.user?.id || null;
    const ip = req.ip || req.connection?.remoteAddress;

    db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut, details_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [utilisateurId, action, ip, statut, JSON.stringify({ method: req.method, path: req.path })]
    ).catch(err => console.error('Audit error:', err.message));

    return originalJson(body);
  };

  next();
};

module.exports = audit;
