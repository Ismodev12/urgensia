'use strict';
require('dotenv').config();

/**
 * Validation et export des variables d'environnement.
 * Le serveur s'arrête immédiatement si une variable critique est manquante.
 */
const required = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_SECRET', 'JWT_REFRESH_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌  Variable d'environnement manquante : ${key}`);
    process.exit(1);
  }
}

module.exports = {
  port:        parseInt(process.env.PORT, 10) || 3001,
  nodeEnv:     process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  db: {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  jwt: {
    secret:             process.env.JWT_SECRET,
    expiresIn:          process.env.JWT_EXPIRES_IN  || '15m',
    refreshSecret:      process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn:   process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
};
