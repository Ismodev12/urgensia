'use strict';
const bcrypt = require('bcryptjs');
const db     = require('../config/db');

/** GET /api/utilisateurs */
const listerUtilisateurs = async (req, res, next) => {
  try {
    const { search, role, statut } = req.query;
    let sql = `
      SELECT u.id, u.nom, u.prenom, u.email, u.role, u.telephone,
             u.photo_url, u.statut, u.date_creation, u.derniere_connexion,
             s.nom AS service_nom, s.id AS service_id
      FROM utilisateurs u
      LEFT JOIN services s ON s.id = u.service_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (search) {
      sql += ` AND (u.nom ILIKE $${idx} OR u.prenom ILIKE $${idx} OR u.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (role)   { sql += ` AND u.role = $${idx++}`;   params.push(role); }
    if (statut) { sql += ` AND u.statut = $${idx++}`; params.push(statut); }

    sql += ` ORDER BY u.date_creation DESC`;

    const { rows } = await db.query(sql, params);
    return res.status(200).json(rows);
  } catch (err) { next(err); }
};

/** GET /api/utilisateurs/:id */
const getUtilisateur = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.role, u.telephone,
              u.photo_url, u.statut, u.date_creation, u.derniere_connexion,
              s.nom AS service_nom, s.id AS service_id
       FROM utilisateurs u
       LEFT JOIN services s ON s.id = u.service_id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    return res.status(200).json(rows[0]);
  } catch (err) { next(err); }
};

/** POST /api/utilisateurs */
const creerUtilisateur = async (req, res, next) => {
  try {
    const { nom, prenom, email, password, role, serviceId, telephone } = req.body;

    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ error: 'Champs obligatoires : nom, prenom, email, password, role' });
    }

    const rolesValides = ['agent', 'medecin', 'admin'];
    if (!rolesValides.includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide', valides: rolesValides });
    }

    const hash = await bcrypt.hash(password, 10);

    const { rows } = await db.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role, service_id, telephone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nom, prenom, email, role, service_id, telephone, statut, date_creation`,
      [nom, prenom, email.toLowerCase().trim(), hash, role, serviceId || null, telephone || null]
    );

    await db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut, details_json)
       VALUES ($1,'Nouvel utilisateur créé',$2,'succes',$3)`,
      [req.user.id, req.ip, JSON.stringify({ newUserId: rows[0].id, role })]
    );

    return res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

/** PATCH /api/utilisateurs/:id */
const modifierUtilisateur = async (req, res, next) => {
  try {
    const { nom, prenom, email, role, serviceId, telephone, statut, password } = req.body;
    const updates = [];
    const params  = [];
    let   idx     = 1;

    if (nom)       { updates.push(`nom = $${idx++}`);         params.push(nom); }
    if (prenom)    { updates.push(`prenom = $${idx++}`);      params.push(prenom); }
    if (email)     { updates.push(`email = $${idx++}`);       params.push(email.toLowerCase().trim()); }
    if (role)      { updates.push(`role = $${idx++}`);        params.push(role); }
    if (serviceId !== undefined) { updates.push(`service_id = $${idx++}`); params.push(serviceId || null); }
    if (telephone) { updates.push(`telephone = $${idx++}`);   params.push(telephone); }
    if (statut)    { updates.push(`statut = $${idx++}`);      params.push(statut); }
    if (password)  {
      const hash = await bcrypt.hash(password, 10);
      updates.push(`mot_de_passe_hash = $${idx++}`);
      params.push(hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à modifier' });
    }

    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, nom, prenom, email, role, service_id, telephone, statut`,
      params
    );

    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    return res.status(200).json(rows[0]);
  } catch (err) { next(err); }
};

/** DELETE /api/utilisateurs/:id */
const supprimerUtilisateur = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
    }

    const { rows } = await db.query(
      `UPDATE utilisateurs SET statut = 'inactif' WHERE id = $1
       RETURNING id, nom, prenom`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    await db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut)
       VALUES ($1,'Utilisateur désactivé',$2,'succes')`,
      [req.user.id, req.ip]
    );

    return res.status(200).json({ message: 'Utilisateur désactivé', utilisateur: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { listerUtilisateurs, getUtilisateur, creerUtilisateur, modifierUtilisateur, supprimerUtilisateur };
