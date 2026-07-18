'use strict';
const db = require('../config/db');

/** GET /api/stats/dashboard — KPIs globaux */
const dashboard = async (req, res, next) => {
  try {
    const [patientsRes, servicesRes, manchesterRes, actifRes] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                                                  AS total_patients,
          COUNT(*) FILTER (WHERE statut = 'en_attente')            AS en_attente,
          COUNT(*) FILTER (WHERE statut = 'en_cours')              AS en_cours,
          COUNT(*) FILTER (WHERE statut = 'pris_en_charge')        AS pris_en_charge,
          COUNT(*) FILTER (WHERE manchester_niveau <= 2)           AS critiques,
          COUNT(*) FILTER (WHERE date_arrivee::date = CURRENT_DATE) AS aujourd_hui
        FROM patients
      `),
      db.query(`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE actif = TRUE) AS actifs,
               SUM(lits_occupes) AS total_lits_occupes,
               SUM(capacite_lits) AS total_capacite,
               ROUND(AVG(lits_occupes::numeric / NULLIF(capacite_lits,0)) * 100) AS taux_moyen
        FROM services
      `),
      db.query(`
        SELECT manchester_niveau AS niveau,
               nm.label,
               nm.couleur_hex AS couleur,
               COUNT(*) AS count,
               ROUND(COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM patients), 0) * 100) AS pourcentage
        FROM patients p
        JOIN niveaux_manchester nm ON nm.niveau = p.manchester_niveau
        GROUP BY p.manchester_niveau, nm.label, nm.couleur_hex
        ORDER BY p.manchester_niveau
      `),
      db.query(`
        SELECT COUNT(*) AS utilisateurs_actifs
        FROM utilisateurs WHERE statut = 'actif'
      `),
    ]);

    return res.status(200).json({
      patients:   patientsRes.rows[0],
      services:   servicesRes.rows[0],
      manchester: manchesterRes.rows,
      utilisateurs: actifRes.rows[0],
    });
  } catch (err) { next(err); }
};

/** GET /api/stats/weekly — Activité 7 derniers jours */
const weekly = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        TO_CHAR(date_arrivee::date, 'Dy') AS jour,
        date_arrivee::date                AS date,
        COUNT(*)                          AS patients,
        COUNT(*) FILTER (WHERE manchester_niveau <= 2) AS critiques
      FROM patients
      WHERE date_arrivee >= NOW() - INTERVAL '7 days'
      GROUP BY date_arrivee::date
      ORDER BY date_arrivee::date ASC
    `);
    return res.status(200).json(rows);
  } catch (err) { next(err); }
};

/** GET /api/stats/services — Occupation des services */
const statsServices = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT s.id, s.nom,
             s.lits_occupes, s.capacite_lits,
             ROUND((s.lits_occupes::numeric / NULLIF(s.capacite_lits,0)) * 100) AS taux_occupation,
             COUNT(p.id) FILTER (WHERE p.statut NOT IN ('pris_en_charge','sorti')) AS patients_actifs
      FROM services s
      LEFT JOIN patients p ON p.service_id = s.id
      WHERE s.actif = TRUE
      GROUP BY s.id
      ORDER BY taux_occupation DESC NULLS LAST
    `);
    return res.status(200).json(rows);
  } catch (err) { next(err); }
};

/** GET /api/stats/analytics — Indicateurs avancés (temps d'attente, affluence, réévaluations) */
const analytics = async (req, res, next) => {
  try {
    const [attenteRes, debitRes, reevalRes, globalRes] = await Promise.all([
      // Temps d'attente moyen (minutes) par niveau Manchester — dernières 24 h
      db.query(`
        SELECT p.manchester_niveau            AS niveau,
               nm.label                       AS label,
               nm.couleur_hex                 AS couleur,
               ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(p.date_prise_en_charge, NOW()) - p.date_arrivee)) / 60)) AS attente_min,
               COUNT(*)                       AS total
        FROM patients p
        JOIN niveaux_manchester nm ON nm.niveau = p.manchester_niveau
        WHERE p.date_arrivee >= NOW() - INTERVAL '24 hours'
        GROUP BY p.manchester_niveau, nm.label, nm.couleur_hex
        ORDER BY p.manchester_niveau
      `),
      // Affluence par heure — aujourd'hui
      db.query(`
        SELECT EXTRACT(HOUR FROM date_arrivee)::int AS heure,
               COUNT(*)                             AS patients,
               COUNT(*) FILTER (WHERE manchester_niveau <= 2) AS critiques
        FROM patients
        WHERE date_arrivee::date = CURRENT_DATE
        GROUP BY heure
        ORDER BY heure
      `),
      // Réévaluations : patients en attente signalés / dont le délai est dépassé
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE p.a_reevaluer)                                                       AS signales,
          COUNT(*) FILTER (WHERE t.date_reevaluation IS NOT NULL AND t.date_reevaluation < NOW())     AS delai_depasse
        FROM patients p
        JOIN triages t ON t.patient_id = p.id AND t.est_courant = TRUE
        WHERE p.statut = 'en_attente'
      `),
      // KPIs globaux du jour
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE date_arrivee::date = CURRENT_DATE)                                                   AS aujourd_hui,
          COUNT(*) FILTER (WHERE date_arrivee::date = CURRENT_DATE AND statut IN ('en_cours','pris_en_charge','sorti')) AS traites_aujourd_hui,
          ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(date_prise_en_charge, NOW()) - date_arrivee)) / 60)
                FILTER (WHERE date_arrivee >= NOW() - INTERVAL '24 hours'))                                            AS attente_moyenne_min
        FROM patients
      `),
    ]);

    // Pic d'affluence (heure avec le plus d'arrivées aujourd'hui)
    const debit = debitRes.rows.map(r => ({
      heure:     r.heure,
      label:     `${String(r.heure).padStart(2, '0')}h`,
      patients:  parseInt(r.patients, 10),
      critiques: parseInt(r.critiques, 10),
    }));
    const pic = debit.reduce((max, r) => (r.patients > (max?.patients ?? -1) ? r : max), null);

    return res.status(200).json({
      attenteParNiveau: attenteRes.rows.map(r => ({
        niveau:     r.niveau,
        label:      r.label,
        couleur:    r.couleur,
        attenteMin: parseInt(r.attente_min, 10) || 0,
        total:      parseInt(r.total, 10),
      })),
      debitParHeure: debit,
      picAffluence:  pic ? { heure: pic.label, patients: pic.patients } : null,
      reevaluations: {
        signales:     parseInt(reevalRes.rows[0].signales, 10),
        delaiDepasse: parseInt(reevalRes.rows[0].delai_depasse, 10),
      },
      global: {
        aujourdHui:        parseInt(globalRes.rows[0].aujourd_hui, 10),
        traitesAujourdHui: parseInt(globalRes.rows[0].traites_aujourd_hui, 10),
        attenteMoyenneMin: parseInt(globalRes.rows[0].attente_moyenne_min, 10) || 0,
      },
    });
  } catch (err) { next(err); }
};

/** GET /api/audit — Journal système (admin only) */
const journalAudit = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const { rows } = await db.query(`
      SELECT ja.*,
             u.nom || ' ' || u.prenom AS utilisateur_nom,
             u.email AS utilisateur_email
      FROM journal_audit ja
      LEFT JOIN utilisateurs u ON u.id = ja.utilisateur_id
      ORDER BY ja.timestamp DESC
      LIMIT $1 OFFSET $2
    `, [Math.min(parseInt(limit, 10), 200), parseInt(offset, 10)]);

    const { rows: total } = await db.query(`SELECT COUNT(*) FROM journal_audit`);

    return res.status(200).json({
      logs: rows,
      total: parseInt(total[0].count, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (err) { next(err); }
};

module.exports = { dashboard, weekly, statsServices, analytics, journalAudit };
