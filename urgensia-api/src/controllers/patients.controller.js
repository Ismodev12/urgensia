'use strict';
const db       = require('../config/db');
const socket   = require('../services/socket.service');
const triage   = require('../services/triage.service');
const notif    = require('../services/notif.service');
const retriage = require('../services/retriage.service');

// ─── Générateur de code suivi patient ───────────────────────────────────────────

const CHARS_CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function genererCodeSuiviPatient(client) {
  let code;
  let attempts = 0;
  do {
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += CHARS_CODE[Math.floor(Math.random() * CHARS_CODE.length)];
    }
    code = `PAT-${suffix}`;
    const { rows } = await client.query(
      'SELECT id FROM patients WHERE code_suivi = $1',
      [code]
    );
    if (rows.length === 0) return code;
    attempts++;
  } while (attempts < 10);
  throw new Error('Impossible de générer un code suivi unique');
}

// ─── Liste des patients (file d'attente triée) ────────────────────────────────

/**
 * GET /api/patients
 * Query: ?statut=en_attente&manchesterNiveau=1&serviceId=xxx&search=nom
 */
const listerPatients = async (req, res, next) => {
  try {
    const { statut, manchesterNiveau, serviceId, search } = req.query;

    let sql = `
      SELECT p.*,
             nm.label        AS manchester_label,
             nm.couleur_hex  AS manchester_couleur,
             COALESCE(s.nom, t.service_oriente) AS service_nom,
             u1.nom || ' ' || u1.prenom AS enregistre_par_nom,
             u2.nom || ' ' || u2.prenom AS pris_en_charge_par_nom,
             ARRAY(
               SELECT sym.label
               FROM patient_symptomes ps
               JOIN symptomes sym ON sym.id = ps.symptome_id
               WHERE ps.patient_id = p.id
             ) AS symptomes
      FROM patients p
      LEFT JOIN niveaux_manchester nm ON nm.niveau = p.manchester_niveau
      LEFT JOIN services           s  ON s.id      = p.service_id
      LEFT JOIN triages            t  ON t.patient_id = p.id AND t.est_courant = TRUE
      LEFT JOIN utilisateurs       u1 ON u1.id     = p.enregistre_par
      LEFT JOIN utilisateurs       u2 ON u2.id     = p.pris_en_charge_par
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (statut) {
      sql += ` AND p.statut = $${idx++}`;
      params.push(statut);
    }
    if (manchesterNiveau) {
      sql += ` AND p.manchester_niveau = $${idx++}`;
      params.push(parseInt(manchesterNiveau, 10));
    }
    if (serviceId) {
      sql += ` AND p.service_id = $${idx++}`;
      params.push(serviceId);
    }
    if (search) {
      sql += ` AND (p.nom ILIKE $${idx} OR p.prenom ILIKE $${idx} OR CAST(p.id AS TEXT) ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    // Tri MTS : niveaux critiques d'abord, puis par date d'arrivée
    sql += ` ORDER BY p.manchester_niveau ASC NULLS LAST, p.date_arrivee ASC`;

    const { rows } = await db.query(sql, params);
    return res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
};

// ─── Détail d'un patient ──────────────────────────────────────────────────────

/**
 * GET /api/patients/:id
 */
const getPatient = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*,
              nm.label        AS manchester_label,
              nm.couleur_hex  AS manchester_couleur,
              nm.delai_max    AS manchester_delai,
              s.nom           AS service_nom,
              ARRAY(
                SELECT sym.label
                FROM patient_symptomes ps
                JOIN symptomes sym ON sym.id = ps.symptome_id
                WHERE ps.patient_id = p.id
              ) AS symptomes,
              t.manchester_niveau AS triage_niveau,
              t.service_oriente,
              t.justification,
              t.score_calcule,
              t.date_triage,
              t.date_reevaluation,
              t.numero_triage
       FROM patients p
       LEFT JOIN niveaux_manchester nm ON nm.niveau = p.manchester_niveau
       LEFT JOIN services           s  ON s.id      = p.service_id
       LEFT JOIN triages            t  ON t.patient_id = p.id AND t.est_courant = TRUE
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Créer un patient ─────────────────────────────────────────────────────────

/**
 * POST /api/patients
 * Body: données du formulaire NewPatientPage + symptômes + constantes
 */
const creerPatient = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      nom, prenom, age, sexe, telephone, adresse,
      temperature, tensionSystolique, tensionDiastolique,
      frequenceCardiaque, saturationOxygene, echelleDouleur,
      symptomes = [], // Array de labels de symptômes
      // Drapeaux symptômes pour le moteur MTS
      douleurThoracique, difficultéRespiratoire, hemorragie,
      traumatisme, perteConnaissance, convulsions, fievre,
      vomissements, malaise, brulures, cephalees, diarrhee,
    } = req.body;

    // ── 1. Calcul MTS ──────────────────────────────────────────────────────
    const triageResult = triage.calculerNiveauManchester({
      douleurThoracique, difficultéRespiratoire, hemorragie,
      traumatisme, perteConnaissance, convulsions, fievre,
      vomissements, malaise, brulures, cephalees, diarrhee,
      temperature, tensionSystolique, tensionDiastolique,
      frequenceCardiaque, saturationOxygene,
      echelleDouleur: echelleDouleur || 0,
      age,
    });

    // ── 2. Trouver le service en base ──────────────────────────────────────
    // Le moteur MTS retourne un nom aligné avec la table services (ex: "Urgences", "Réanimation")
    let serviceId = null;
    const { rows: serviceRows } = await client.query(
      `SELECT id FROM services WHERE nom ILIKE $1 LIMIT 1`,
      [triageResult.service]
    );
    serviceId = serviceRows[0]?.id || null;

    // Fallback : matching partiel si pas de match exact
    if (!serviceId) {
      const { rows: fallbackRows } = await client.query(
        `SELECT id FROM services WHERE nom ILIKE $1 OR $2 ILIKE '%' || nom || '%' LIMIT 1`,
        [`%${triageResult.service}%`, triageResult.service]
      );
      serviceId = fallbackRows[0]?.id || null;
    }

    const codeSuivi = await genererCodeSuiviPatient(client);

    // ── 3. Insérer le patient ──────────────────────────────────────────────
    const { rows: patientRows } = await client.query(
      `INSERT INTO patients (
         nom, prenom, age, sexe, telephone, adresse,
         temperature, tension_systolique, tension_diastolique,
         frequence_cardiaque, saturation_oxygene, echelle_douleur,
         manchester_niveau, service_id, statut, resume_clinique,
         enregistre_par, code_suivi
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'en_attente',$15,$16,$17)
       RETURNING *`,
      [
        nom, prenom, parseInt(age, 10), sexe, telephone || null, adresse || null,
        temperature || null, tensionSystolique || null, tensionDiastolique || null,
        frequenceCardiaque || null, saturationOxygene || null, parseInt(echelleDouleur, 10) || 0,
        triageResult.niveau, serviceId,
        triageResult.resumeClinique,
        req.user.id,
        codeSuivi,
      ]
    );

    const patient = patientRows[0];

    // ── 4. Lier les symptômes ──────────────────────────────────────────────
    if (symptomes.length > 0) {
      const { rows: symptomeRows } = await client.query(
        `SELECT id, label FROM symptomes WHERE label = ANY($1)`,
        [symptomes]
      );

      for (const sym of symptomeRows) {
        await client.query(
          `INSERT INTO patient_symptomes (patient_id, symptome_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [patient.id, sym.id]
        );
      }
    }

    // ── 5. Enregistrer le triage (avec date de réévaluation) ───────────────
    await client.query(
      `INSERT INTO triages (
         patient_id, realise_par, manchester_niveau,
         service_oriente, justification, score_calcule, date_reevaluation
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        patient.id,
        req.user.id,
        triageResult.niveau,
        triageResult.service,
        triageResult.resumeClinique,
        JSON.stringify(triageResult.scoreDetail),
        retriage.calculerDateReevaluation(new Date(), triageResult.niveau),
      ]
    );

    // ── 6. Incrémenter l'occupation du service ─────────────────────────────
    if (serviceId) {
      await client.query(
        `UPDATE services
         SET lits_occupes = LEAST(lits_occupes + 1, capacite_lits)
         WHERE id = $1`,
        [serviceId]
      );
    }

    // ── 7. Journal d'audit ─────────────────────────────────────────────────
    await client.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut, details_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'Nouveau patient enregistré', req.ip, 'succes',
        JSON.stringify({ patientId: patient.id, manchesterNiveau: triageResult.niveau })]
    );

    await client.query('COMMIT');

    // ── 8. WebSocket + Notifications (hors transaction) ───────────────────
    const patientAvecService = { ...patient, service: triageResult.service };

    socket.emitNouveauPatient(patientAvecService);
    socket.emitQueueMoved(); // les positions en file changent pour les patients existants

    // Notifier les autres agents du nouveau patient
    await notif.notifierAgentsNouveauPatient(
      patientAvecService,
      { niveau: triageResult.niveau, service: triageResult.service },
      req.user.id
    );

    // Notifier les médecins si cas critique (niveaux 1-2)
    if (triageResult.niveau <= 2) {
      await notif.notifierMedecinsCritique(patientAvecService);
    }

    return res.status(201).json({
      patient: patientAvecService,
      triage: {
        niveau:           triageResult.niveau,
        label:            triageResult.label,
        couleur:          triageResult.couleur,
        bgCouleur:        triageResult.bgCouleur,
        delai:            triageResult.delai,
        service:          triageResult.service,
        serviceLabel:     triageResult.serviceLabel,
        resumeClinique:   triageResult.resumeClinique,
        recommandations:  triageResult.recommandations,
        scoreDetail:      triageResult.scoreDetail,
      },
      codeSuivi: patient.code_suivi,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── Changer le statut d'un patient ──────────────────────────────────────────

/**
 * PATCH /api/patients/:id/statut
 * Body: { statut: 'en_cours' | 'pris_en_charge' | 'sorti' }
 *
 * La prise en charge (en_cours / pris_en_charge) est réservée au médecin :
 * l'agent d'accueil ne peut pas faire évoluer un patient vers ces statuts.
 */
const PRISE_EN_CHARGE_STATUTS = ['en_cours', 'pris_en_charge'];

const changerStatut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = ['en_attente', 'en_cours', 'pris_en_charge', 'sorti'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({ error: 'Statut invalide', valides: statutsValides });
    }

    // Contrôle d'accès métier : seule l'équipe médicale assure la prise en charge
    if (req.user.role === 'agent' && PRISE_EN_CHARGE_STATUTS.includes(statut)) {
      return res.status(403).json({
        error: 'La prise en charge est réservée au médecin.',
      });
    }

    // Ancien statut + service — pour la gestion automatique des lits
    const { rows: avant } = await db.query(
      'SELECT statut, service_id FROM patients WHERE id = $1',
      [id]
    );
    if (!avant[0]) return res.status(404).json({ error: 'Patient non trouvé' });
    const ancienStatut = avant[0].statut;
    const serviceIdLit = avant[0].service_id;

    const { rows } = await db.query(
      `UPDATE patients
       SET statut = $1::text,
           pris_en_charge_par = CASE WHEN $1::text = 'en_cours' THEN $2 ELSE pris_en_charge_par END,
           date_prise_en_charge = CASE WHEN $1::text = 'en_cours' AND date_prise_en_charge IS NULL THEN NOW() ELSE date_prise_en_charge END,
           date_sortie = CASE WHEN $1::text = 'sorti' THEN NOW() ELSE date_sortie END
       WHERE id = $3
       RETURNING *`,
      [statut, req.user.id, id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const patient = rows[0];

    // WebSocket — tous les agents/médecins
    socket.emitStatutPatient(id, statut, patient.manchester_niveau);

    // La file avance → chaque patient en attente rafraîchit sa position (temps réel)
    socket.emitQueueMoved();

    // ── Gestion automatique des lits ──────────────────────────────────────
    // Un lit est occupé tant que le patient est « en cours » ou « pris en charge »,
    // et libéré dès qu'il sort (ou revient en attente). Clampé entre 0 et la capacité.
    const OCCUPANT = ['en_cours', 'pris_en_charge'];
    const etaitOccupant = OCCUPANT.includes(ancienStatut);
    const estOccupant   = OCCUPANT.includes(statut);
    const deltaLit = (!etaitOccupant && estOccupant) ? 1 : (etaitOccupant && !estOccupant) ? -1 : 0;
    if (deltaLit !== 0 && serviceIdLit) {
      const { rows: svc } = await db.query(
        `UPDATE services
         SET lits_occupes = GREATEST(0, LEAST(capacite_lits, lits_occupes + $1))
         WHERE id = $2
         RETURNING *`,
        [deltaLit, serviceIdLit]
      );
      if (svc[0]) socket.emitCapaciteService(svc[0]);
    }

    // WebSocket — patient suivi (si code_suivi présent)
    if (patient.code_suivi) {
      socket.emitSuiviUpdate(patient.code_suivi, {
        statut,
        message: statut === 'en_cours'
          ? '🩺 C\'est votre tour ! Un médecin va vous prendre en charge maintenant.'
          : statut === 'pris_en_charge'
            ? '✅ Vous êtes pris(e) en charge par l\'équipe médicale.'
            : statut === 'sorti'
              ? '🏠 Votre prise en charge est terminée. Bonne récupération !'
              : null,
      });
    }

    // Notifications
    await notif.notifierChangementStatut(patient, statut);

    // Audit
    await db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut, details_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, `Statut patient changé : ${statut}`, req.ip, 'succes',
        JSON.stringify({ patientId: id, statut })]
    );

    return res.status(200).json(patient);
  } catch (err) {
    next(err);
  }
};

// ─── Re-triage d'un patient ───────────────────────────────────────────────────

/**
 * POST /api/patients/:id/triage
 * Re-triage d'un patient encore en file par l'infirmier de triage (agent d'accueil).
 *
 *  - Recalcule le niveau MTS à partir des nouvelles données.
 *  - NE remplace PAS le triage précédent : crée un nouvel enregistrement
 *    (historique conservé), recalcule la date de réévaluation.
 *  - Réordonne la file (par gravité), notifie et journalise
 *    (qui / quand / ancien niveau / nouveau niveau).
 *
 *  Accès : rôle 'agent' uniquement (cf. patients.routes.js).
 */
const retriagePatient = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // 1. Verrouiller le patient et vérifier son éligibilité
    const { rows: patientRows } = await client.query(
      `SELECT id, nom, prenom, statut, code_suivi, date_arrivee, manchester_niveau
         FROM patients WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const patient = patientRows[0];
    if (!patient) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient non trouvé' });
    }
    if (!['en_attente', 'en_cours'].includes(patient.statut)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error:  'Le re-triage n\'est possible que pour un patient encore dans la file (en attente ou en cours).',
        statut: patient.statut,
      });
    }

    // 2. Recalcul MTS
    const triageResult = triage.calculerNiveauManchester(req.body);

    // 3. Résoudre le service orienté (même logique qu'à l'enregistrement)
    let serviceId = null;
    const { rows: serviceRows } = await client.query(
      'SELECT id FROM services WHERE nom ILIKE $1 LIMIT 1',
      [triageResult.service]
    );
    serviceId = serviceRows[0]?.id || null;

    if (!serviceId) {
      const { rows: fallbackRows } = await client.query(
        `SELECT id FROM services WHERE nom ILIKE $1 OR $2 ILIKE '%' || nom || '%' LIMIT 1`,
        [`%${triageResult.service}%`, triageResult.service]
      );
      serviceId = fallbackRows[0]?.id || null;
    }

    // 4. Enregistrer le re-triage (historique conservé + journal d'activité)
    const resultat = await retriage.enregistrerRetriage(client, {
      patientId:    id,
      triageResult,
      serviceId,
      userId:       req.user.id,
      ip:           req.ip,
    });

    // 5. Nouvelle position dans la file réordonnée (par gravité)
    const { position, patientsDevant } = await retriage.calculerPositionFile(client, {
      id,
      manchester_niveau: triageResult.niveau,
      date_arrivee:      patient.date_arrivee,
    });

    await client.query('COMMIT');

    // 6. Temps réel + notifications (hors transaction)
    const patientMaj = {
      ...patient,
      manchester_niveau: triageResult.niveau,
      service:           triageResult.service,
    };

    socket.emitRetriage(patientMaj, {
      ancienNiveau: resultat.ancienNiveau,
      position,
      patientsDevant,
    });

    // Escalade : si le re-triage rend le cas critique (1-2), alerter les médecins
    if (triageResult.niveau <= 2 && (resultat.ancienNiveau === null || resultat.ancienNiveau > 2)) {
      await notif.notifierMedecinsCritique(patientMaj);
    }

    return res.status(200).json({
      message:          'Re-triage effectué',
      ancienNiveau:     resultat.ancienNiveau,
      nouveauNiveau:    resultat.nouveauNiveau,
      numeroTriage:     resultat.numeroTriage,
      dateReevaluation: resultat.dateReevaluation,
      position,
      patientsDevant,
      triage: {
        niveau:          triageResult.niveau,
        label:           triageResult.label,
        couleur:         triageResult.couleur,
        bgCouleur:       triageResult.bgCouleur,
        delai:           triageResult.delai,
        service:         triageResult.service,
        serviceLabel:    triageResult.serviceLabel,
        resumeClinique:  triageResult.resumeClinique,
        recommandations: triageResult.recommandations,
        scoreDetail:     triageResult.scoreDetail,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── Détection des délais de réévaluation dépassés ────────────────────────────

/**
 * POST /api/patients/reevaluation/scan
 * Lance la détection des patients en attente dont le délai cible est dépassé,
 * les marque « à réévaluer » et notifie l'infirmier de triage.
 * Destiné à une tâche planifiée ou au chargement de la file.
 * Accès : rôle 'agent' ou 'admin' (cf. routes).
 */
const scanReevaluations = async (req, res, next) => {
  try {
    const signales = await retriage.detecterPatientsAReevaluer();
    return res.status(200).json({
      detectes: signales.length,
      patients: signales.map(p => ({
        id:               p.id,
        nom:              p.nom,
        prenom:           p.prenom,
        manchesterNiveau: p.manchester_niveau,
        dateReevaluation: p.date_reevaluation,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Historique des triages d'un patient ──────────────────────────────────────

/**
 * GET /api/patients/:id/triages
 * Retourne tous les triages du patient (du plus récent au plus ancien),
 * triage initial + re-triages, avec l'indicateur du résultat courant.
 */
const getHistoriqueTriages = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT t.id, t.manchester_niveau, t.niveau_precedent, t.service_oriente,
              t.justification, t.score_calcule, t.date_triage, t.date_reevaluation,
              t.est_courant, t.numero_triage,
              u.nom || ' ' || u.prenom AS realise_par_nom
         FROM triages t
         LEFT JOIN utilisateurs u ON u.id = t.realise_par
        WHERE t.patient_id = $1
        ORDER BY t.numero_triage DESC`,
      [req.params.id]
    );
    return res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
};

// ─── Cas critique d'urgence (enregistrement rapide sans constantes) ─────────

/**
 * POST /api/patients/urgence
 * Body: { nom?, prenom?, age?, sexe?, motifUrgence, notes? }
 * - Attribue automatiquement le niveau Manchester 1 (ROUGE CRITIQUE)
 * - Place le patient en priorité absolue dans la file
 * - Notifie immédiatement tous les médecins
 */
const creerPatientUrgence = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      nom          = 'INCONNU',
      prenom       = '—',
      age          = null,
      sexe         = 'Inconnu',
      motifUrgence,
      notes        = '',
    } = req.body;

    if (!motifUrgence) {
      return res.status(400).json({ error: 'motifUrgence est requis pour un cas critique' });
    }

    // ── 1. Service Urgences/Réanimation (niveau 1 obligatoire) ────────────────
    const { rows: serviceRows } = await client.query(
      `SELECT id FROM services WHERE nom ILIKE $1 LIMIT 1`,
      ['Urgences']
    );
    const serviceId = serviceRows[0]?.id || null;

    // ── 2. Résumé clinique auto ────────────────────────────────────────────────
    const resumeClinique = [
      `🚨 CAS CRITIQUE — ${motifUrgence.toUpperCase()}`,
      `Enregistrement d’urgence sans relevé de constantes.`,
      notes ? `Observations : ${notes}` : null,
    ].filter(Boolean).join(' ');

    // ── 3. Insérer le patient (niveau 1 forcé) ────────────────────────────
    const codeSuiviUrgence = await genererCodeSuiviPatient(client);
    const { rows: patientRows } = await client.query(
      `INSERT INTO patients (
         nom, prenom, age, sexe,
         manchester_niveau, service_id, statut, resume_clinique,
         enregistre_par, code_suivi
       ) VALUES ($1,$2,$3,$4, 1, $5, 'en_attente', $6, $7, $8)
       RETURNING *`,
      [
        nom.trim().toUpperCase(),
        prenom.trim(),
        age ? parseInt(age, 10) : null,
        sexe,
        serviceId,
        resumeClinique,
        req.user.id,
        codeSuiviUrgence,
      ]
    );

    const patient = patientRows[0];

    // ── 4. Enregistrer le triage forcé (avec date de réévaluation) ──────────
    await client.query(
      `INSERT INTO triages (
         patient_id, realise_par, manchester_niveau,
         service_oriente, justification, score_calcule, date_reevaluation
       ) VALUES ($1, $2, 1, $3, $4, $5, $6)`,
      [
        patient.id,
        req.user.id,
        'Urgences / Réanimation',
        resumeClinique,
        JSON.stringify({ motifUrgence, type: 'cas_critique_urgence', score: 100 }),
        retriage.calculerDateReevaluation(new Date(), 1),
      ]
    );

    // ── 5. Incrémenter l’occupation du service ────────────────────────────────
    if (serviceId) {
      await client.query(
        `UPDATE services
         SET lits_occupes = LEAST(lits_occupes + 1, capacite_lits)
         WHERE id = $1`,
        [serviceId]
      );
    }

    // ── 6. Journal d’audit ────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut, details_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'Cas critique enregistré (urgence vitale)',
        req.ip,
        'succes',
        JSON.stringify({ patientId: patient.id, motifUrgence, manchesterNiveau: 1 }),
      ]
    );

    await client.query('COMMIT');

    // ── 7. WebSocket + Notifications médecins (hors transaction) ─────────────
    const patientAvecService = { ...patient, service: 'Urgences / Réanimation' };

    socket.emitNouveauPatient(patientAvecService);
    socket.emitQueueMoved(); // les positions en file changent pour les patients existants
    await notif.notifierMedecinsCritique(patientAvecService);
    await notif.notifierAgentsNouveauPatient(
      patientAvecService,
      { niveau: 1, service: 'Urgences / Réanimation' },
      req.user.id
    );

    return res.status(201).json({
      patient,
      triage: {
        niveau:   1,
        label:    'Critique',
        couleur:  '#DC2626',
        service:  'Urgences / Réanimation',
        delai:    'Immédiat',
        resumeClinique,
        motifUrgence,
      },
      codeSuivi: patient.code_suivi,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  listerPatients,
  getPatient,
  creerPatient,
  changerStatut,
  retriagePatient,
  creerPatientUrgence,
  scanReevaluations,
  getHistoriqueTriages,
};
