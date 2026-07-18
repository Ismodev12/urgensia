'use strict';
const db = require('../config/db');

/** GET /api/notifications */
const mesNotifications = async (req, res, next) => {
  try {
    const { lue } = req.query;
    let sql = `
      SELECT n.*, p.nom AS patient_nom, p.prenom AS patient_prenom,
             p.manchester_niveau
      FROM notifications n
      LEFT JOIN patients p ON p.id = n.patient_id
      WHERE n.destinataire_id = $1
    `;
    const params = [req.user.id];

    if (lue !== undefined) {
      sql += ` AND n.est_lue = $2`;
      params.push(lue === 'true');
    }

    sql += ` ORDER BY n.date_creation DESC LIMIT 50`;

    const { rows } = await db.query(sql, params);
    return res.status(200).json(rows);
  } catch (err) { next(err); }
};

/** PATCH /api/notifications/:id/lire */
const marquerLue = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE notifications SET est_lue = TRUE
       WHERE id = $1 AND destinataire_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Notification non trouvée' });
    return res.status(200).json(rows[0]);
  } catch (err) { next(err); }
};

/** PATCH /api/notifications/lire-tout */
const marquerToutesLues = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET est_lue = TRUE
       WHERE destinataire_id = $1 AND est_lue = FALSE`,
      [req.user.id]
    );
    return res.status(200).json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) { next(err); }
};

/** GET /api/notifications/count */
const compterNonLues = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE destinataire_id = $1 AND est_lue = FALSE`,
      [req.user.id]
    );
    return res.status(200).json({ count: parseInt(rows[0].count, 10) });
  } catch (err) { next(err); }
};

module.exports = { mesNotifications, marquerLue, marquerToutesLues, compterNonLues };
