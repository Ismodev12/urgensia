'use strict';
const { Pool } = require('pg');
const env      = require('./env');

/**
 * Pool de connexions PostgreSQL.
 * Réutilise les connexions existantes pour de meilleures performances.
 */
const pool = new Pool({
  host:     env.db.host,
  port:     env.db.port,
  database: env.db.database,
  user:     env.db.user,
  password: env.db.password,
  max:      20,           // Connexions max simultanées
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('💥  Erreur inattendue du pool PostgreSQL :', err.message);
});

/**
 * Exécute une requête SQL.
 * @param {string} text   - Requête SQL avec placeholders $1, $2...
 * @param {Array}  params - Paramètres de la requête
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquiert une connexion dédiée pour les transactions.
 */
const getClient = () => pool.connect();

/**
 * Vérifie la connexion à la base de données au démarrage.
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('✅  PostgreSQL connecté avec succès');
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, testConnection, pool };
