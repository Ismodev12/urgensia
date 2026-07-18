'use strict';

const db     = require('../config/db');
const triage = require('../services/triage.service');
const socket = require('../services/socket.service');

// ─── Générateur de code unique ────────────────────────────────────────────────

/**
 * Génère un code de suivi unique du format URG-XXXX
 * ex: URG-4X7K, URG-A2MB
 */
function genererCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // pas O, I, 0, 1 (ambiguïté)
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `URG-${suffix}`;
}

async function genererCodeUnique(client) {
  let code;
  let tentatives = 0;
  do {
    code = genererCode();
    const { rows } = await client.query(
      'SELECT id FROM pre_triages WHERE code_suivi = $1', [code]
    );
    if (rows.length === 0) return code;
    tentatives++;
  } while (tentatives < 10);
  throw new Error('Impossible de générer un code unique');
}

// ─── Calcul position en file ──────────────────────────────────────────────────

/**
 * Calcule la position du patient dans la file d'attente globale.
 * La position tient compte des priorités MTS :
 * les patients de niveau inférieur (plus urgents) passent devant.
 *
 * @param {number} manchesterNiveau - Niveau MTS du pré-triage (1-5)
 * @returns {{ position, patientsDevant, estimationMinutes }}
 */
async function calculerPosition(manchesterNiveau) {
  // Compter les patients "actifs" (en_attente ou arrive) plus urgents OU même niveau arrivés avant
  const { rows } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE manchester_niveau < $1 AND statut IN ('en_attente','arrive'))
        AS devant_priorite,
      COUNT(*) FILTER (WHERE manchester_niveau = $1 AND statut IN ('en_attente','arrive'))
        AS meme_niveau
    FROM pre_triages
    WHERE statut IN ('en_attente', 'arrive')
      AND expire_le > NOW()
  `, [manchesterNiveau]);

  const devantPriorite = parseInt(rows[0].devant_priorite, 10);
  const memeNiveau     = parseInt(rows[0].meme_niveau, 10);

  // Position = tous les plus urgents + ceux au même niveau (qui sont arrivés avant)
  const position = devantPriorite + memeNiveau;

  // Estimation du délai selon le niveau
  const delaisParNiveau = { 1: 0, 2: 10, 3: 30, 4: 60, 5: 120 };
  const delaiBase = delaisParNiveau[manchesterNiveau] || 60;
  const estimationMinutes = delaiBase + (devantPriorite * 5); // +5min par patient plus urgent

  return {
    position,
    patientsDevant: position,
    estimationMinutes,
  };
}

// ─── Contrôleurs ─────────────────────────────────────────────────────────────

/**
 * POST /api/pretriage
 * Corps : symptômes + constantes + identité (optionnel)
 * Public — aucune authentification requise
 */
const soumettrePreTriage = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      nom     = 'Inconnu',
      prenom  = '—',
      age     = null,
      sexe    = 'Inconnu',
      telephone = null,

      // Drapeaux symptômes
      douleurThoracique      = false,
      difficultéRespiratoire = false,
      hemorragie             = false,
      traumatisme            = false,
      perteConnaissance      = false,
      convulsions            = false,
      fievre                 = false,
      vomissements           = false,
      malaise                = false,
      brulures               = false,
      cephalees              = false,
      diarrhee               = false,

      // Constantes vitales
      echelleDouleur  = 0,
      temperature     = null,
    } = req.body;

    // ── 1. Calcul MTS ───────────────────────────────────────────────────────
    const triageResult = triage.calculerNiveauManchester({
      douleurThoracique,
      difficultéRespiratoire,
      hemorragie,
      traumatisme,
      perteConnaissance,
      convulsions,
      fievre,
      vomissements,
      malaise,
      brulures,
      cephalees,
      diarrhee,
      echelleDouleur: parseInt(echelleDouleur, 10) || 0,
      temperature,
      tensionSystolique:  null,
      tensionDiastolique: null,
      frequenceCardiaque: null,
      saturationOxygene:  null,
      age,
    });

    // ── 2. Génération du code unique ────────────────────────────────────────
    const codeSuivi = await genererCodeUnique(client);

    // ── 3. Insertion en base ────────────────────────────────────────────────
    const { rows } = await client.query(`
      INSERT INTO pre_triages (
        code_suivi, nom, prenom, age, sexe, telephone,
        douleur_thoracique, difficulte_respiratoire, hemorragie, traumatisme,
        perte_connaissance, convulsions, fievre, vomissements, malaise,
        brulures, cephalees, diarrhee,
        echelle_douleur, temperature,
        manchester_niveau, resume_clinique, recommandations, service_oriente, score_detail
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,
        $21,$22,$23,$24,$25
      )
      RETURNING *
    `, [
      codeSuivi,
      nom.trim(), prenom.trim(),
      age ? parseInt(age, 10) : null,
      sexe, telephone || null,

      // drapeaux
      Boolean(douleurThoracique), Boolean(difficultéRespiratoire), Boolean(hemorragie),
      Boolean(traumatisme), Boolean(perteConnaissance), Boolean(convulsions),
      Boolean(fievre), Boolean(vomissements), Boolean(malaise),
      Boolean(brulures), Boolean(cephalees), Boolean(diarrhee),

      // constantes
      parseInt(echelleDouleur, 10) || 0,
      temperature ? parseFloat(temperature) : null,

      // résultat MTS
      triageResult.niveau,
      triageResult.resumeClinique,
      JSON.stringify(triageResult.recommandations),
      triageResult.service,
      JSON.stringify(triageResult.scoreDetail),
    ]);

    await client.query('COMMIT');

    const pretriage = rows[0];

    // ── 4. WebSocket : notifier les agents d'un nouveau pré-triage ─────────
    socket.emitPreTriageNouveau({
      id:              pretriage.id,
      codeSuivi:       pretriage.code_suivi,
      nom:             pretriage.nom,
      prenom:          pretriage.prenom,
      age:             pretriage.age,
      manchesterNiveau: triageResult.niveau,
      manchesterLabel:  triageResult.label,
      manchesterCouleur: triageResult.couleur,
      service:         triageResult.service,
      dateCreation:    pretriage.date_creation,
    });

    // ── 5. Réponse ──────────────────────────────────────────────────────────
    const { position, patientsDevant, estimationMinutes } = await calculerPosition(triageResult.niveau);

    return res.status(201).json({
      codeSuivi: pretriage.code_suivi,
      niveau:    triageResult.niveau,
      label:     triageResult.label,
      couleur:   triageResult.couleur,
      bgCouleur: triageResult.bgCouleur,
      delai:     triageResult.delai,
      service:   triageResult.service,
      resumeClinique:  triageResult.resumeClinique,
      recommandations: triageResult.recommandations,
      scoreDetail:     triageResult.scoreDetail,
      position,
      patientsDevant,
      estimationMinutes,
      expireAt: pretriage.expire_le,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── GET /api/pretriage/:code ─────────────────────────────────────────────────

/**
 * GET /api/pretriage/:code
 * Retourne le statut + position en file en temps réel.
 * Public — aucune authentification requise.
 */
const getStatutPreTriage = async (req, res, next) => {
  try {
    const { code } = req.params;

    const { rows } = await db.query(
      `SELECT pt.*,
              nm.label       AS manchester_label,
              nm.couleur_hex AS manchester_couleur,
              nm.bg_couleur_hex AS manchester_bg_couleur,
              nm.delai_max   AS manchester_delai
       FROM pre_triages pt
       LEFT JOIN niveaux_manchester nm ON nm.niveau = pt.manchester_niveau
       WHERE pt.code_suivi = $1`,
      [code.toUpperCase()]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Code de suivi introuvable. Vérifiez le code ou effectuez un nouveau pré-triage.' });
    }

    const pt = rows[0];

    // Vérifier expiration
    if (new Date(pt.expire_le) < new Date() && pt.statut === 'en_attente') {
      await db.query(`UPDATE pre_triages SET statut = 'expire' WHERE id = $1`, [pt.id]);
      pt.statut = 'expire';
    }

    // Position en file (uniquement si encore en attente)
    let position = null;
    let patientsDevant = null;
    let estimationMinutes = null;

    if (pt.statut === 'en_attente' || pt.statut === 'arrive') {
      const pos = await calculerPosition(pt.manchester_niveau);
      position          = pos.position;
      patientsDevant    = pos.patientsDevant;
      estimationMinutes = pos.estimationMinutes;
    }

    return res.status(200).json({
      id:               pt.id,
      codeSuivi:        pt.code_suivi,
      nom:              pt.nom,
      prenom:           pt.prenom,
      age:              pt.age,
      sexe:             pt.sexe,
      statut:           pt.statut,
      manchesterNiveau: pt.manchester_niveau,
      manchesterLabel:  pt.manchester_label,
      manchesterCouleur: pt.manchester_couleur,
      manchesterBgCouleur: pt.manchester_bg_couleur,
      manchesterDelai:  pt.manchester_delai,
      resumeClinique:   pt.resume_clinique,
      recommandations:  pt.recommandations,
      serviceOriente:   pt.service_oriente,
      position,
      patientsDevant,
      estimationMinutes,
      dateCreation:     pt.date_creation,
      dateConfirmation: pt.date_confirmation,
      expireAt:         pt.expire_le,
    });

  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/pretriage/:code/confirmer ────────────────────────────────────

/**
 * PATCH /api/pretriage/:code/confirmer
 * L'agent confirme l'arrivée physique du patient.
 * Protégé — agent authentifié requis.
 */
const confirmerArrivee = async (req, res, next) => {
  try {
    const { code } = req.params;

    const { rows } = await db.query(
      `UPDATE pre_triages
       SET statut = 'arrive', date_confirmation = NOW()
       WHERE code_suivi = $1 AND statut = 'en_attente' AND expire_le > NOW()
       RETURNING *`,
      [code.toUpperCase()]
    );

    if (!rows[0]) {
      return res.status(404).json({
        error: 'Pré-triage introuvable, déjà confirmé ou expiré.'
      });
    }

    const pt = rows[0];

    // Notifier le patient via WebSocket
    socket.emitPreTriageUpdate(pt.code_suivi, {
      statut: 'arrive',
      message: 'Votre arrivée a été confirmée. Un agent s\'occupe de vous.',
    });

    return res.status(200).json({
      id:       pt.id,
      codeSuivi: pt.code_suivi,
      statut:   pt.statut,
      nom:      pt.nom,
      prenom:   pt.prenom,
      manchesterNiveau: pt.manchester_niveau,
      resumeClinique: pt.resume_clinique,
      dateConfirmation: pt.date_confirmation,
    });

  } catch (err) {
    next(err);
  }
};

// ─── GET /api/pretriage (liste pour agents) ───────────────────────────────────

/**
 * GET /api/pretriage
 * Retourne la liste des pré-triages actifs (en_attente + arrive).
 * Protégé — agent / médecin / admin.
 */
const listerPreTriages = async (req, res, next) => {
  try {
    const { statut } = req.query;

    let sql = `
      SELECT pt.*,
             nm.label       AS manchester_label,
             nm.couleur_hex AS manchester_couleur,
             nm.bg_couleur_hex AS manchester_bg_couleur
      FROM pre_triages pt
      LEFT JOIN niveaux_manchester nm ON nm.niveau = pt.manchester_niveau
      WHERE pt.expire_le > NOW()
    `;
    const params = [];

    if (statut) {
      sql += ` AND pt.statut = $1`;
      params.push(statut);
    } else {
      sql += ` AND pt.statut IN ('en_attente', 'arrive')`;
    }

    sql += ` ORDER BY pt.manchester_niveau ASC NULLS LAST, pt.date_creation ASC`;

    const { rows } = await db.query(sql, params);

    return res.status(200).json(rows.map(pt => ({
      id:               pt.id,
      codeSuivi:        pt.code_suivi,
      nom:              pt.nom,
      prenom:           pt.prenom,
      age:              pt.age,
      sexe:             pt.sexe,
      telephone:        pt.telephone,
      statut:           pt.statut,
      manchesterNiveau: pt.manchester_niveau,
      manchesterLabel:  pt.manchester_label,
      manchesterCouleur: pt.manchester_couleur,
      manchesterBgCouleur: pt.manchester_bg_couleur,
      resumeClinique:   pt.resume_clinique,
      serviceOriente:   pt.service_oriente,
      dateCreation:     pt.date_creation,
      expireAt:         pt.expire_le,
    })));

  } catch (err) {
    next(err);
  }
};

module.exports = {
  soumettrePreTriage,
  getStatutPreTriage,
  confirmerArrivee,
  listerPreTriages,
};
