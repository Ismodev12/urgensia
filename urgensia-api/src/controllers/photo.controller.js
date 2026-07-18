'use strict';

const path = require('path');
const fs   = require('fs');
const db   = require('../config/db');
const { UPLOAD_DIR } = require('../middleware/upload');

const API_BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

// ─── POST /api/patients/:id/photo ────────────────────────────────────────────

/**
 * Upload ou remplacement de la photo de profil d'un patient.
 * Le fichier est traité par multer avant d'arriver ici (req.file).
 */
const uploadPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    // Récupérer l'ancienne photo pour la supprimer
    const { rows: old } = await db.query(
      'SELECT photo_url FROM patients WHERE id = $1',
      [id]
    );

    if (!old[0]) {
      // Supprimer le fichier uploadé orphelin
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Patient introuvable.' });
    }

    // Supprimer l'ancienne photo si elle existe
    if (old[0].photo_url) {
      const oldFilename = old[0].photo_url.split('/uploads/patients/')[1];
      if (oldFilename) {
        const oldPath = path.join(UPLOAD_DIR, oldFilename);
        fs.unlink(oldPath, () => {}); // ignorer les erreurs (fichier déjà supprimé)
      }
    }

    // URL publique de la nouvelle photo
    const photoUrl = `${API_BASE}/uploads/patients/${req.file.filename}`;

    // Mettre à jour en base
    const { rows } = await db.query(
      `UPDATE patients SET photo_url = $1 WHERE id = $2
       RETURNING id, nom, prenom, photo_url`,
      [photoUrl, id]
    );

    return res.status(200).json({
      message:  'Photo mise à jour avec succès.',
      photoUrl: rows[0].photo_url,
      patient:  rows[0],
    });

  } catch (err) {
    // Nettoyer le fichier en cas d'erreur
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

// ─── DELETE /api/patients/:id/photo ──────────────────────────────────────────

/**
 * Supprime la photo de profil d'un patient.
 */
const deletePhoto = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      'SELECT photo_url FROM patients WHERE id = $1',
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Patient introuvable.' });
    }

    if (rows[0].photo_url) {
      const filename = rows[0].photo_url.split('/uploads/patients/')[1];
      if (filename) {
        const filePath = path.join(UPLOAD_DIR, filename);
        fs.unlink(filePath, () => {});
      }
    }

    await db.query(
      'UPDATE patients SET photo_url = NULL WHERE id = $1',
      [id]
    );

    return res.status(200).json({ message: 'Photo supprimée avec succès.' });

  } catch (err) {
    next(err);
  }
};

module.exports = { uploadPhoto, deletePhoto };
