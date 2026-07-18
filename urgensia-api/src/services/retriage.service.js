'use strict';

/**
 * ============================================================
 *  URGENSIA — Service de re-triage (réévaluation MTS)
 * ============================================================
 *
 *  Règle métier :
 *   - L'état d'un patient peut évoluer pendant l'attente. Le système ne
 *     modifie JAMAIS seul le niveau d'urgence ; il calcule une date de
 *     réévaluation et signale qu'une réévaluation est nécessaire une fois
 *     ce délai dépassé.
 *   - dateReevaluation = dateTriage + délai cible du niveau attribué.
 *   - Le re-triage n'écrase pas le résultat précédent : il crée un nouvel
 *     enregistrement (est_courant = TRUE) et conserve l'historique.
 *
 *  Les fonctions de calcul sont pures (testables sans base de données).
 *  Les fonctions d'accès aux données acceptent une injection de dépendances
 *  (`deps.db`, `deps.notif`) pour rester testables.
 */

const db    = require('../config/db');
const notif = require('./notif.service');

// ─── Délais cibles de prise en charge (minutes) ───────────────────────────────
// Source de vérité applicative, alignée sur niveaux_manchester.delai_cible_minutes.
// Sert de repli si la colonne n'est pas renseignée.
const DELAIS_CIBLES_MINUTES = {
  1: 0,    // Critique     → Immédiat
  2: 10,   // Très Urgent  → 10 minutes
  3: 30,   // Urgent       → 30 minutes
  4: 60,   // Standard     → 60 minutes
  5: 120,  // Non Urgent   → 2 heures
};

/**
 * Retourne le délai cible (minutes) d'un niveau Manchester.
 * @param {number} niveau - 1 à 5
 * @returns {number} délai en minutes (60 par défaut si niveau inconnu)
 */
function delaiCibleMinutes(niveau) {
  const d = DELAIS_CIBLES_MINUTES[niveau];
  return Number.isFinite(d) ? d : 60;
}

/**
 * Calcule la date de réévaluation d'un résultat de triage.
 *   dateReevaluation = dateTriage + délai cible du niveau
 *
 * @param {Date|string|number} dateTriage - Date du triage
 * @param {number} niveau                  - Niveau Manchester (1-5)
 * @param {number} [delaiMinutes]          - Délai forcé (sinon dérivé du niveau)
 * @returns {Date} date de réévaluation
 */
function calculerDateReevaluation(dateTriage, niveau, delaiMinutes) {
  const base = dateTriage instanceof Date ? dateTriage : new Date(dateTriage);
  if (Number.isNaN(base.getTime())) {
    throw new TypeError('dateTriage invalide');
  }
  const minutes = Number.isFinite(delaiMinutes) ? delaiMinutes : delaiCibleMinutes(niveau);
  return new Date(base.getTime() + minutes * 60 * 1000);
}

/**
 * Indique si le délai de réévaluation est dépassé.
 *
 * @param {Date|string|number} dateReevaluation - Date cible de réévaluation
 * @param {Date} [maintenant=new Date()]         - Heure courante (injectable pour les tests)
 * @returns {boolean} true si maintenant >= dateReevaluation
 */
function estDelaiDepasse(dateReevaluation, maintenant = new Date()) {
  if (dateReevaluation === null || dateReevaluation === undefined) return false;
  const cible = dateReevaluation instanceof Date ? dateReevaluation : new Date(dateReevaluation);
  if (Number.isNaN(cible.getTime())) return false;
  return maintenant.getTime() >= cible.getTime();
}

// ─── Détection des délais dépassés (tâche planifiée / chargement de file) ──────

/**
 * Parcourt les patients en attente, repère ceux dont le délai de réévaluation
 * est dépassé et qui ne sont pas déjà signalés, les marque « à réévaluer » et
 * crée une notification pour l'infirmier de triage + une entrée de journal.
 *
 * Idempotent : un patient déjà signalé (a_reevaluer = TRUE) n'est pas re-notifié.
 *
 * @param {Object} [deps]        - Injection de dépendances (tests)
 * @param {Object} [deps.db]     - Module d'accès base (défaut : config/db)
 * @param {Object} [deps.notif]  - Service de notifications (défaut : notif.service)
 * @returns {Promise<Array>} liste des patients nouvellement signalés
 */
async function detecterPatientsAReevaluer(deps = {}) {
  const _db    = deps.db    || db;
  const _notif = deps.notif || notif;

  const { rows } = await _db.query(
    `SELECT p.id, p.nom, p.prenom, p.manchester_niveau, p.code_suivi,
            t.date_reevaluation
     FROM patients p
     JOIN triages t ON t.patient_id = p.id AND t.est_courant = TRUE
     WHERE p.statut = 'en_attente'
       AND p.a_reevaluer = FALSE
       AND t.date_reevaluation IS NOT NULL
       AND t.date_reevaluation <= NOW()
     ORDER BY p.manchester_niveau ASC, t.date_reevaluation ASC`
  );

  const signales = [];
  for (const p of rows) {
    // 1. Marquer le patient « à réévaluer » (sans toucher au niveau d'urgence)
    await _db.query('UPDATE patients SET a_reevaluer = TRUE WHERE id = $1', [p.id]);

    // 2. Notifier l'infirmier de triage (agent d'accueil)
    await _notif.notifierReevaluationRequise(p);

    // 3. Journal d'activité (action système, sans utilisateur)
    await _db.query(
      `INSERT INTO journal_audit (utilisateur_id, action, statut, details_json)
       VALUES (NULL, $1, 'succes', $2)`,
      [
        'Délai de réévaluation dépassé',
        JSON.stringify({
          patientId:        p.id,
          manchesterNiveau: p.manchester_niveau,
          dateReevaluation: p.date_reevaluation,
        }),
      ]
    );

    signales.push(p);
  }

  return signales;
}

// ─── Enregistrement d'un re-triage (conservation de l'historique) ──────────────

/**
 * Écrit en base le résultat d'un re-triage SANS écraser le triage précédent :
 *   - le triage courant passe à est_courant = FALSE (archivé) ;
 *   - un nouveau triage est inséré (est_courant = TRUE, numero_triage + 1,
 *     niveau_precedent = ancien niveau, date_reevaluation recalculée) ;
 *   - le patient est mis à jour (niveau, résumé, service, a_reevaluer = FALSE) ;
 *   - une entrée de journal d'activité trace qui / quand / ancien / nouveau niveau.
 *
 * À appeler dans une transaction (client dédié), comme creerPatient.
 *
 * @param {Object} client                 - Client PostgreSQL (transaction en cours)
 * @param {Object} params
 * @param {string} params.patientId
 * @param {Object} params.triageResult    - Résultat de triage.service.calculerNiveauManchester
 * @param {?string} params.serviceId      - UUID du service orienté (peut être null)
 * @param {string} params.userId          - UUID de l'infirmier qui re-trie
 * @param {?string} [params.ip]           - Adresse IP (audit)
 * @returns {Promise<Object>} { ancienNiveau, nouveauNiveau, numeroTriage, dateReevaluation, triage }
 */
async function enregistrerRetriage(client, { patientId, triageResult, serviceId = null, userId, ip = null }) {
  // 1. Récupérer le triage courant (ancien niveau + numéro le plus élevé)
  const { rows: courantRows } = await client.query(
    `SELECT manchester_niveau, numero_triage
       FROM triages
      WHERE patient_id = $1 AND est_courant = TRUE
      LIMIT 1`,
    [patientId]
  );
  const { rows: maxRows } = await client.query(
    `SELECT COALESCE(MAX(numero_triage), 0) AS max_num FROM triages WHERE patient_id = $1`,
    [patientId]
  );

  const ancienNiveau  = courantRows[0]?.manchester_niveau ?? null;
  const nouveauNiveau = triageResult.niveau;
  const numeroTriage  = parseInt(maxRows[0].max_num, 10) + 1;
  const dateReevaluation = calculerDateReevaluation(new Date(), nouveauNiveau);

  // 2. Archiver le(s) triage(s) courant(s) — l'historique est conservé
  await client.query(
    'UPDATE triages SET est_courant = FALSE WHERE patient_id = $1 AND est_courant = TRUE',
    [patientId]
  );

  // 3. Insérer le nouveau résultat de triage (courant)
  const { rows: triageRows } = await client.query(
    `INSERT INTO triages (
       patient_id, realise_par, manchester_niveau, niveau_precedent,
       service_oriente, justification, score_calcule,
       est_courant, numero_triage, date_reevaluation
     ) VALUES ($1,$2,$3,$4,$5,$6,$7, TRUE, $8, $9)
     RETURNING *`,
    [
      patientId,
      userId,
      nouveauNiveau,
      ancienNiveau,
      triageResult.service,
      triageResult.resumeClinique,
      JSON.stringify(triageResult.scoreDetail),
      numeroTriage,
      dateReevaluation,
    ]
  );

  // 4. Mettre à jour le patient (niveau courant + nettoyage du marqueur)
  await client.query(
    `UPDATE patients
        SET manchester_niveau = $1,
            resume_clinique   = $2,
            service_id        = COALESCE($3, service_id),
            a_reevaluer       = FALSE
      WHERE id = $4`,
    [nouveauNiveau, triageResult.resumeClinique, serviceId, patientId]
  );

  // 5. Journal d'activité : qui, quand, ancien niveau, nouveau niveau
  await client.query(
    `INSERT INTO journal_audit (utilisateur_id, action, adresse_ip, statut, details_json)
     VALUES ($1, $2, $3, 'succes', $4)`,
    [
      userId,
      'Re-triage patient',
      ip,
      JSON.stringify({
        patientId,
        ancienNiveau,
        nouveauNiveau,
        numeroTriage,
        dateReevaluation,
      }),
    ]
  );

  return {
    ancienNiveau,
    nouveauNiveau,
    numeroTriage,
    dateReevaluation,
    triage: triageRows[0],
  };
}

// ─── Position dans la file (réordonnancement par gravité) ──────────────────────

/**
 * Calcule la position d'un patient dans la file d'attente, triée par gravité
 * (niveau Manchester croissant) puis ancienneté (date d'arrivée).
 *
 * @param {Object} dbExec  - db ou client de transaction
 * @param {Object} patient - { id, manchester_niveau, date_arrivee }
 * @returns {Promise<{ position: number, patientsDevant: number }>}
 */
async function calculerPositionFile(dbExec, patient) {
  const { rows } = await dbExec.query(
    `SELECT
       COUNT(*) FILTER (
         WHERE manchester_niveau < $1
           AND statut IN ('en_attente','en_cours')
           AND id != $2
       ) AS devant_priorite,
       COUNT(*) FILTER (
         WHERE manchester_niveau = $1
           AND statut IN ('en_attente','en_cours')
           AND date_arrivee < $3
           AND id != $2
       ) AS meme_niveau_avant
     FROM patients
     WHERE statut IN ('en_attente','en_cours')`,
    [patient.manchester_niveau, patient.id, patient.date_arrivee]
  );

  const patientsDevant =
    parseInt(rows[0].devant_priorite, 10) + parseInt(rows[0].meme_niveau_avant, 10);

  return { position: patientsDevant + 1, patientsDevant };
}

module.exports = {
  DELAIS_CIBLES_MINUTES,
  delaiCibleMinutes,
  calculerDateReevaluation,
  estDelaiDepasse,
  detecterPatientsAReevaluer,
  enregistrerRetriage,
  calculerPositionFile,
};
