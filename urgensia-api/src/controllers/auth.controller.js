'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const env    = require('../config/env');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const signAccess = (payload) =>
  jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

const signRefresh = (payload) =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });

const refreshExpiresDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7); // 7 jours
  return d;
};

// ─── Contrôleurs ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Récupérer l'utilisateur avec son service
    const { rows } = await db.query(
      `SELECT u.*, s.nom AS service_nom
       FROM utilisateurs u
       LEFT JOIN services s ON s.id = u.service_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (user.statut !== 'actif') {
      return res.status(403).json({ error: 'Compte désactivé. Contactez l\'administrateur.' });
    }

    // Vérification du mot de passe
    const valid = await bcrypt.compare(password, user.mot_de_passe_hash);
    if (!valid) {
      // Journal d'audit : tentative échouée
      await db.query(
        `INSERT INTO journal_audit (action, adresse_ip, statut, details_json)
         VALUES ($1, $2, $3, $4)`,
        ['Tentative de connexion échouée', req.ip, 'echec',
          JSON.stringify({ email: user.email })]
      );
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Génération des tokens
    const payload = {
      id:        user.id,
      email:     user.email,
      role:      user.role,
      serviceId: user.service_id,
    };

    const accessToken  = signAccess(payload);
    const refreshToken = signRefresh({ id: user.id });

    // Stocker le refresh token
    await db.query(
      `INSERT INTO sessions (utilisateur_id, refresh_token, adresse_ip, user_agent, expire_le)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, refreshToken, req.ip, req.headers['user-agent'], refreshExpiresDate()]
    );

    // Mettre à jour dernière connexion
    await db.query(
      `UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = $1`,
      [user.id]
    );

    // Journal d'audit : connexion réussie
    await db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'Connexion utilisateur', req.ip, 'succes']
    );

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id:        user.id,
        nom:       user.nom,
        prenom:    user.prenom,
        email:     user.email,
        role:      user.role,
        service:   user.service_nom,
        serviceId: user.service_id,
        photoUrl:  user.photo_url,
        statut:    user.statut,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token manquant' });
    }

    // Vérifier token valide (signature)
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
    } catch {
      return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
    }

    // Vérifier en base (non révoqué, non expiré)
    const { rows } = await db.query(
      `SELECT s.*, u.email, u.role, u.service_id, u.statut
       FROM sessions s
       JOIN utilisateurs u ON u.id = s.utilisateur_id
       WHERE s.refresh_token = $1 AND s.revoque = FALSE AND s.expire_le > NOW()`,
      [refreshToken]
    );

    if (!rows[0]) {
      return res.status(401).json({ error: 'Session invalide ou expirée' });
    }

    const session = rows[0];

    if (session.statut !== 'actif') {
      return res.status(403).json({ error: 'Compte désactivé' });
    }

    // Générer un nouvel access token
    const newAccessToken = signAccess({
      id:        decoded.id,
      email:     session.email,
      role:      session.role,
      serviceId: session.service_id,
    });

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <token>
 * Body: { refreshToken }
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await db.query(
        `UPDATE sessions SET revoque = TRUE WHERE refresh_token = $1`,
        [refreshToken]
      );
    }

    // Journal
    if (req.user) {
      await db.query(
        `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, 'Déconnexion', req.ip, 'succes']
      );
    }

    return res.status(200).json({ message: 'Déconnecté avec succès' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Renvoie le profil complet de l'utilisateur connecté.
 */
const me = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.role, u.telephone,
              u.photo_url, u.statut, u.date_creation, u.derniere_connexion,
              s.nom AS service_nom, s.id AS service_id
       FROM utilisateurs u
       LEFT JOIN services s ON s.id = u.service_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Génère un token de réinitialisation (valide 1h).
 * En mode démo : retourne le token directement dans la réponse.
 * En production : enverrait un email avec le lien de réinitialisation.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Adresse email requise' });
    }

    // Rechercher l'utilisateur
    const { rows } = await db.query(
      `SELECT id, nom, prenom, email FROM utilisateurs WHERE email = $1 AND statut = 'actif'`,
      [email.toLowerCase().trim()]
    );

    // Toujours retourner un succès (pour ne pas révéler si l'email existe)
    if (!rows[0]) {
      return res.status(200).json({
        message: 'Si cette adresse existe dans notre système, un lien de réinitialisation a été généré.',
      });
    }

    const user = rows[0];

    // Invalider les anciens tokens non utilisés
    await db.query(
      `UPDATE password_resets SET utilise = TRUE WHERE utilisateur_id = $1 AND utilise = FALSE`,
      [user.id]
    );

    // Générer un token sécurisé (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');

    // Stocker le token (expire dans 1h)
    await db.query(
      `INSERT INTO password_resets (utilisateur_id, token, expire_le)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [user.id, token]
    );

    // Journal d'audit
    await db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut, details_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'Demande de réinitialisation de mot de passe', req.ip, 'succes',
        JSON.stringify({ email: user.email })]
    );

    // En mode démo/développement : retourner le token directement
    // En production : envoyer un email avec le lien
    return res.status(200).json({
      message: 'Si cette adresse existe dans notre système, un lien de réinitialisation a été généré.',
      // Token visible en mode démo uniquement
      resetToken: token,
      resetUrl: `${env.frontendUrl}/reset-password/${token}`,
      expiresIn: '1 heure',
    });

  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 * Valide le token et met à jour le mot de passe.
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérifier le token (non expiré, non utilisé)
    const { rows } = await db.query(
      `SELECT pr.*, u.email, u.nom, u.prenom
       FROM password_resets pr
       JOIN utilisateurs u ON u.id = pr.utilisateur_id
       WHERE pr.token = $1 AND pr.utilise = FALSE AND pr.expire_le > NOW()`,
      [token]
    );

    if (!rows[0]) {
      return res.status(400).json({
        error: 'Token invalide ou expiré. Veuillez refaire une demande de réinitialisation.'
      });
    }

    const resetRecord = rows[0];

    // Hasher le nouveau mot de passe
    const hash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await db.query(
      `UPDATE utilisateurs SET mot_de_passe_hash = $1 WHERE id = $2`,
      [hash, resetRecord.utilisateur_id]
    );

    // Marquer le token comme utilisé
    await db.query(
      `UPDATE password_resets SET utilise = TRUE WHERE id = $1`,
      [resetRecord.id]
    );

    // Révoquer toutes les sessions existantes (sécurité)
    await db.query(
      `UPDATE sessions SET revoque = TRUE WHERE utilisateur_id = $1`,
      [resetRecord.utilisateur_id]
    );

    // Journal d'audit
    await db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut)
       VALUES ($1, $2, $3, $4)`,
      [resetRecord.utilisateur_id, 'Mot de passe réinitialisé', req.ip, 'succes']
    );

    return res.status(200).json({
      message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, me, forgotPassword, resetPassword };
