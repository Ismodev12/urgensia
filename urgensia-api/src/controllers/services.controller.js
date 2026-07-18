'use strict';
const db     = require('../config/db');
const socket = require('../services/socket.service');

/** GET /api/services */
const listerServices = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*,
              ROUND((s.lits_occupes::numeric / NULLIF(s.capacite_lits,0)) * 100) AS taux_occupation
       FROM services s
       WHERE s.actif = TRUE
       ORDER BY s.nom ASC`
    );
    return res.status(200).json(rows);
  } catch (err) { next(err); }
};

/** GET /api/services/:id */
const getService = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*,
              ROUND((s.lits_occupes::numeric / NULLIF(s.capacite_lits,0)) * 100) AS taux_occupation,
              COUNT(p.id) FILTER (WHERE p.statut = 'en_attente') AS patients_attente,
              COUNT(p.id) FILTER (WHERE p.statut = 'en_cours')   AS patients_en_cours
       FROM services s
       LEFT JOIN patients p ON p.service_id = s.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Service non trouvé' });
    return res.status(200).json(rows[0]);
  } catch (err) { next(err); }
};

/** POST /api/services */
const creerService = async (req, res, next) => {
  try {
    const { nom, description, medecinChef, capaciteLits } = req.body;
    if (!nom || !capaciteLits) {
      return res.status(400).json({ error: 'Nom et capacité requis' });
    }
    const { rows } = await db.query(
      `INSERT INTO services (nom, description, medecin_chef, capacite_lits)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nom, description || null, medecinChef || null, parseInt(capaciteLits, 10)]
    );
    await db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut, details_json)
       VALUES ($1,'Nouveau service créé',$2,'succes',$3)`,
      [req.user.id, req.ip, JSON.stringify({ serviceId: rows[0].id, nom })]
    );
    socket.emitCapaciteService(rows[0]);
    return res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

/** PUT /api/services/:id */
const modifierService = async (req, res, next) => {
  try {
    const { nom, description, medecinChef, capaciteLits, litsOccupes, actif } = req.body;
    const { rows } = await db.query(
      `UPDATE services
       SET nom           = COALESCE($1, nom),
           description   = COALESCE($2, description),
           medecin_chef  = COALESCE($3, medecin_chef),
           capacite_lits = COALESCE($4, capacite_lits),
           lits_occupes  = COALESCE($5, lits_occupes),
           actif         = COALESCE($6, actif)
       WHERE id = $7
       RETURNING *`,
      [nom, description, medecinChef, capaciteLits, litsOccupes, actif, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Service non trouvé' });
    socket.emitCapaciteService(rows[0]);
    return res.status(200).json(rows[0]);
  } catch (err) { next(err); }
};

/** DELETE /api/services/:id */
const supprimerService = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE services SET actif = FALSE WHERE id = $1 RETURNING id, nom`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Service non trouvé' });
    await db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut)
       VALUES ($1,'Service désactivé',$2,'succes')`,
      [req.user.id, req.ip]
    );
    return res.status(200).json({ message: 'Service désactivé', service: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { listerServices, getService, creerService, modifierService, supprimerService };
