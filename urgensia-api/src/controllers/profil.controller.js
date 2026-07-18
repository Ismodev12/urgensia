'use strict';

/**
 * ============================================================
 *  URGENSIA — Profil self-service
 *  Permet à TOUT utilisateur authentifié (agent, médecin, admin)
 *  de gérer son propre compte : infos, photo, mot de passe.
 *  (À distinguer de /api/utilisateurs, réservé à l'admin pour
 *   gérer les comptes des autres.)
 * ============================================================
 */

const path   = require('path');
const fs     = require('fs');
const bcrypt = require('bcryptjs');
const db     = require('../config/db');
const { USER_UPLOAD_DIR } = require('../middleware/upload');

const API_BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

const journaliser = (userId, action, ip, details = {}) =>
  db.query(
    `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut, details_json)
     VALUES ($1, $2, $3, 'succes', $4)`,
    [userId, action, ip, JSON.stringify(details)]
  ).catch(err => console.error('Audit error:', err.message));

// ─── GET /api/profil ──────────────────────────────────────────────────────────

/** Profil complet de l'utilisateur connecté. */
const getProfil = async (req, res, next) => {
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
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    return res.status(200).json(rows[0]);
  } catch (err) { next(err); }
};

// ─── PATCH /api/profil ──────────────────────────────────────────────────────

/**
 * Met à jour ses propres informations : nom, prénom, téléphone, email.
 * (Le rôle, le service et le statut ne sont PAS modifiables ici — réservé admin.)
 */
const modifierProfil = async (req, res, next) => {
  try {
    const { nom, prenom, telephone, email } = req.body;

    const updates = [];
    const params  = [];
    let   idx     = 1;

    if (nom    !== undefined) { updates.push(`nom = $${idx++}`);       params.push(nom); }
    if (prenom !== undefined) { updates.push(`prenom = $${idx++}`);    params.push(prenom); }
    if (telephone !== undefined) { updates.push(`telephone = $${idx++}`); params.push(telephone || null); }
    if (email  !== undefined) { updates.push(`email = $${idx++}`);     params.push(email.toLowerCase().trim()); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à modifier' });
    }

    params.push(req.user.id);
    const { rows } = await db.query(
      `UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, nom, prenom, email, telephone, role, photo_url`,
      params
    );

    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    await journaliser(req.user.id, 'Profil mis à jour', req.ip, { champs: updates.length });
    return res.status(200).json(rows[0]);
  } catch (err) { next(err); }
};

// ─── PATCH /api/profil/mot-de-passe ──────────────────────────────────────────

/** Change son propre mot de passe (vérifie le mot de passe actuel). */
const changerMotDePasse = async (req, res, next) => {
  try {
    const { motDePasseActuel, nouveauMotDePasse } = req.body;

    if (!motDePasseActuel || !nouveauMotDePasse) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis.' });
    }
    if (nouveauMotDePasse.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    }

    const { rows } = await db.query(
      'SELECT mot_de_passe_hash FROM utilisateurs WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const valide = await bcrypt.compare(motDePasseActuel, rows[0].mot_de_passe_hash);
    if (!valide) {
      await journaliser(req.user.id, 'Changement de mot de passe refusé', req.ip, { raison: 'mot de passe actuel incorrect' });
      return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    }

    const hash = await bcrypt.hash(nouveauMotDePasse, 10);
    await db.query('UPDATE utilisateurs SET mot_de_passe_hash = $1 WHERE id = $2', [hash, req.user.id]);

    await journaliser(req.user.id, 'Mot de passe modifié', req.ip);
    return res.status(200).json({ message: 'Mot de passe modifié avec succès.' });
  } catch (err) { next(err); }
};

// ─── POST /api/profil/photo ──────────────────────────────────────────────────

/** Upload / remplacement de sa propre photo de profil (multipart : champ "photo"). */
const uploadPhotoProfil = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });

    const { rows: old } = await db.query(
      'SELECT photo_url FROM utilisateurs WHERE id = $1',
      [req.user.id]
    );
    if (!old[0]) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    // Supprimer l'ancienne photo de profil si elle existe
    if (old[0].photo_url) {
      const oldFilename = old[0].photo_url.split('/uploads/utilisateurs/')[1];
      if (oldFilename) fs.unlink(path.join(USER_UPLOAD_DIR, oldFilename), () => {});
    }

    const photoUrl = `${API_BASE}/uploads/utilisateurs/${req.file.filename}`;
    const { rows } = await db.query(
      `UPDATE utilisateurs SET photo_url = $1 WHERE id = $2
       RETURNING id, nom, prenom, photo_url`,
      [photoUrl, req.user.id]
    );

    await journaliser(req.user.id, 'Photo de profil mise à jour', req.ip);
    return res.status(200).json({
      message:  'Photo de profil mise à jour.',
      photoUrl: rows[0].photo_url,
    });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

// ─── DELETE /api/profil/photo ────────────────────────────────────────────────

/** Supprime sa propre photo de profil. */
const supprimerPhotoProfil = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT photo_url FROM utilisateurs WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    if (rows[0].photo_url) {
      const filename = rows[0].photo_url.split('/uploads/utilisateurs/')[1];
      if (filename) fs.unlink(path.join(USER_UPLOAD_DIR, filename), () => {});
    }

    await db.query('UPDATE utilisateurs SET photo_url = NULL WHERE id = $1', [req.user.id]);

    await journaliser(req.user.id, 'Photo de profil supprimée', req.ip);
    return res.status(200).json({ message: 'Photo de profil supprimée.' });
  } catch (err) { next(err); }
};

module.exports = {
  getProfil,
  modifierProfil,
  changerMotDePasse,
  uploadPhotoProfil,
  supprimerPhotoProfil,
};
