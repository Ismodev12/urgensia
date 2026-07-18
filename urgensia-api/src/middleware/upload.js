'use strict';

const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');

// ─── Dossiers de stockage ─────────────────────────────────────────────────────
const UPLOAD_DIR      = path.join(__dirname, '..', '..', 'uploads', 'patients');
const USER_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'utilisateurs');

// Créer les dossiers s'ils n'existent pas
for (const dir of [UPLOAD_DIR, USER_UPLOAD_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── Filtre : images uniquement ───────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers image (JPEG, PNG, WebP) sont acceptés.'), false);
  }
};

// ─── Fabrique d'uploaders (un dossier + un préfixe de fichier par usage) ───────
const makeUploader = (dir, prefix) => multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
      const name = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    },
  }),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 Mo max
});

// Photos patients (existant) + photos de profil utilisateurs (nouveau)
const upload     = makeUploader(UPLOAD_DIR, 'patient');
const uploadUser = makeUploader(USER_UPLOAD_DIR, 'user');

module.exports = { upload, uploadUser, UPLOAD_DIR, USER_UPLOAD_DIR };
