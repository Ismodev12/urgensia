'use strict';

/**
 * Middleware RBAC (Role-Based Access Control).
 * Usage : router.get('/route', auth, roles('admin', 'medecin'), controller)
 *
 * @param  {...string} allowedRoles - Rôles autorisés
 */
const roles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Accès refusé',
      required: allowedRoles,
      current: req.user.role,
    });
  }

  next();
};

module.exports = roles;
